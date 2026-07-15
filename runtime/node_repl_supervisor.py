#!/usr/bin/env python3
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time


DEFAULT_IDLE_TIMEOUT_SECONDS = 300.0
MINIMUM_IDLE_TIMEOUT_SECONDS = 0.05
SHUTDOWN_GRACE_SECONDS = 1.0


class RpcActivity:
    def __init__(self):
        self._last_activity = time.monotonic()
        self._lock = threading.Lock()
        self._pending_child_ids = set()
        self._pending_parent_ids = set()

    def touch(self):
        with self._lock:
            self._last_activity = time.monotonic()

    def record_parent_message(self, line):
        self._record_message(line, from_parent=True)

    def record_child_message(self, line):
        self._record_message(line, from_parent=False)

    def _record_message(self, line, *, from_parent):
        try:
            value = json.loads(line)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return

        messages = value if isinstance(value, list) else [value]
        with self._lock:
            for message in messages:
                if not isinstance(message, dict) or "id" not in message:
                    continue
                message_id = json.dumps(
                    message["id"],
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                )
                is_request = "method" in message
                is_response = "result" in message or "error" in message
                if from_parent and is_request:
                    self._pending_parent_ids.add(message_id)
                elif from_parent and is_response:
                    self._pending_child_ids.discard(message_id)
                elif not from_parent and is_request:
                    self._pending_child_ids.add(message_id)
                elif not from_parent and is_response:
                    self._pending_parent_ids.discard(message_id)

    def has_been_idle_for(self, seconds):
        with self._lock:
            no_pending_requests = not self._pending_parent_ids and not self._pending_child_ids
            return no_pending_requests and time.monotonic() - self._last_activity >= seconds


class JsonLineTracker:
    def __init__(self, record_line):
        self._buffer = b""
        self._record_line = record_line

    def feed(self, chunk):
        self._buffer += chunk
        while b"\n" in self._buffer:
            line, self._buffer = self._buffer.split(b"\n", 1)
            if line.strip():
                self._record_line(line)


def idle_timeout_seconds():
    raw_value = os.environ.get(
        "CHATGPT_NODE_REPL_IDLE_TIMEOUT_SECONDS",
        str(DEFAULT_IDLE_TIMEOUT_SECONDS),
    )
    try:
        value = float(raw_value)
    except ValueError:
        return DEFAULT_IDLE_TIMEOUT_SECONDS
    if not math.isfinite(value) or value <= 0:
        return DEFAULT_IDLE_TIMEOUT_SECONDS
    return max(MINIMUM_IDLE_TIMEOUT_SECONDS, value)


def write_all(file_descriptor, data):
    while data:
        written = os.write(file_descriptor, data)
        if written == 0:
            raise BrokenPipeError
        data = data[written:]


def terminate_process_group(child):
    if child.poll() is not None:
        return
    try:
        os.killpg(child.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        child.wait(timeout=SHUTDOWN_GRACE_SECONDS)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait()


def normalized_return_code(return_code):
    return 128 - return_code if return_code < 0 else return_code


def main():
    implementation = Path(__file__).with_name("node_repl.bin")
    if not os.access(implementation, os.X_OK):
        print(f"Missing executable node_repl implementation: {implementation}", file=sys.stderr)
        return 127

    try:
        child = subprocess.Popen(
            [str(implementation), *sys.argv[1:]],
            bufsize=0,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            start_new_session=True,
        )
    except OSError as error:
        print(f"Could not start node_repl implementation: {error}", file=sys.stderr)
        return 127

    activity = RpcActivity()
    parent_closed = threading.Event()
    output_closed = threading.Event()
    stop_requested = threading.Event()

    def request_stop(_signal_number, _frame):
        stop_requested.set()

    for signal_number in (signal.SIGHUP, signal.SIGINT, signal.SIGTERM):
        signal.signal(signal_number, request_stop)

    def pump_parent_input():
        tracker = JsonLineTracker(activity.record_parent_message)
        try:
            while chunk := os.read(sys.stdin.fileno(), 65_536):
                activity.touch()
                tracker.feed(chunk)
                write_all(child.stdin.fileno(), chunk)
        except (BrokenPipeError, OSError):
            pass
        finally:
            parent_closed.set()
            try:
                child.stdin.close()
            except OSError:
                pass

    def pump_child_output():
        tracker = JsonLineTracker(activity.record_child_message)
        try:
            while chunk := os.read(child.stdout.fileno(), 65_536):
                activity.touch()
                tracker.feed(chunk)
                write_all(sys.stdout.fileno(), chunk)
        except (BrokenPipeError, OSError):
            pass
        finally:
            output_closed.set()

    input_thread = threading.Thread(target=pump_parent_input, daemon=True)
    output_thread = threading.Thread(target=pump_child_output, daemon=True)
    input_thread.start()
    output_thread.start()

    intentional_shutdown = False
    timeout = idle_timeout_seconds()
    while child.poll() is None:
        if stop_requested.is_set() or parent_closed.is_set():
            intentional_shutdown = True
            break
        if output_closed.is_set():
            try:
                child.wait(timeout=0.1)
            except subprocess.TimeoutExpired:
                intentional_shutdown = True
            break
        if activity.has_been_idle_for(timeout):
            intentional_shutdown = True
            break
        time.sleep(0.05)

    if intentional_shutdown:
        terminate_process_group(child)
    return_code = child.wait()
    output_thread.join(timeout=SHUTDOWN_GRACE_SECONDS)
    return 0 if intentional_shutdown else normalized_return_code(return_code)


if __name__ == "__main__":
    raise SystemExit(main())
