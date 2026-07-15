import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";

const supervisorSource = new URL("../runtime/node_repl_supervisor.py", import.meta.url);
const fakeImplementation = `#!/usr/bin/env python3
import json
import sys
import time

for line in sys.stdin.buffer:
    message = json.loads(line)
    if message.get("method") == "exit":
        raise SystemExit(int(message.get("params", {}).get("code", 1)))
    time.sleep(float(message.get("params", {}).get("delay", 0)))
    response = {"jsonrpc": "2.0", "id": message["id"], "result": message.get("params")}
    print(json.dumps(response, separators=(",", ":")), flush=True)
`;

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "node-repl-supervisor-test-"));
  const supervisor = join(root, "node_repl");
  const implementation = join(root, "node_repl.bin");
  t.after(() => rm(root, { force: true, recursive: true }));

  await copyFile(supervisorSource, supervisor);
  await writeFile(implementation, fakeImplementation);
  await Promise.all([chmod(supervisor, 0o755), chmod(implementation, 0o755)]);
  return supervisor;
}

function waitForLine(stream, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timed out waiting for supervisor output"));
    }, timeoutMs);
    const onData = (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      cleanup();
      resolve(line);
    };
    const onEnd = () => {
      cleanup();
      reject(new Error("supervisor output closed before a complete line"));
    };
    const cleanup = () => {
      clearTimeout(timer);
      stream.off("data", onData);
      stream.off("end", onEnd);
    };
    stream.setEncoding("utf8");
    stream.on("data", onData);
    stream.on("end", onEnd);
  });
}

function waitForExit(child, stderr, timeoutMs = 2_000) {
  if (child.exitCode != null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timed out waiting for supervisor exit: ${stderr()}`));
    }, timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (signal) reject(new Error(`supervisor exited via ${signal}: ${stderr()}`));
      else resolve(code);
    });
  });
}

async function startSupervisor(t, idleTimeout) {
  const supervisor = await fixture(t);
  const child = spawn(supervisor, [], {
    env: {
      ...process.env,
      CHATGPT_NODE_REPL_IDLE_TIMEOUT_SECONDS: String(idleTimeout),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  return { child, stderr: () => stderr };
}

test("node_repl supervisor preserves a request that outlives the idle timeout", async (t) => {
  const { child, stderr } = await startSupervisor(t, 0.15);
  const exit = waitForExit(child, stderr);
  const output = waitForLine(child.stdout);
  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id: 7,
    method: "evaluate",
    params: { delay: 0.4, value: "kept alive" },
  })}\n`);

  await delay(250);
  assert.equal(child.exitCode, null);
  assert.deepEqual(JSON.parse(await output), {
    jsonrpc: "2.0",
    id: 7,
    result: { delay: 0.4, value: "kept alive" },
  });
  assert.equal(await exit, 0);
  assert.equal(stderr(), "");
});

test("node_repl supervisor terminates its child when the parent pipe closes", async (t) => {
  const { child, stderr } = await startSupervisor(t, 10);
  const exit = waitForExit(child, stderr);

  child.stdin.end();

  assert.equal(await exit, 0);
  assert.equal(stderr(), "");
});

test("node_repl supervisor preserves an unexpected implementation failure", async (t) => {
  const { child, stderr } = await startSupervisor(t, 10);
  const exit = waitForExit(child, stderr);
  child.stdin.write(`${JSON.stringify({
    jsonrpc: "2.0",
    id: 8,
    method: "exit",
    params: { code: 23 },
  })}\n`);

  assert.equal(await exit, 23);
  assert.equal(stderr(), "");
});
