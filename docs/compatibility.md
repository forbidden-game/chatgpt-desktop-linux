# Compatibility status

This document distinguishes measured behavior from planned work. A visible UI
entry is not treated as proof that its Linux backend works.

## Build verified

- ChatGPT `26.707.91948` with Electron `42.1.0`.
- complete assembly with all six fail-closed Linux patches applied.
- deterministic Debian packaging and package-content smoke checks.

## Runtime verified on Kubuntu

An isolated packaged-runtime smoke test was repeated with ChatGPT
`26.707.91948` and Electron `42.1.0`. In the current X11 desktop session, it
verified X11 startup, GPU render-node ownership, the Electron renderer sandbox,
local webview health, and the Codex CLI `0.144.1` app-server handshake. Real
`node_repl` initialization and idle cleanup, plus bidirectional focus switching
between overlapping maximized windows, were last repeated with `26.707.72221`.
Native Wayland startup was last repeated with `26.707.71524`; the current test
session has no Wayland display socket. KDE StatusNotifier registration and tray
Quit were last verified with `26.707.61608`: invoking Quit through the DBus menu
removed the Electron main process, all child processes, and the tray
registration.

The complete interactive runtime checks below were last repeated with ChatGPT
`26.707.30751` and Electron `42.1.0`:

- packaged production mode with the official webview.
- native Wayland, GPU render-node ownership, and Electron renderer sandbox.
- opaque Linux title-bar controls that follow the system light/dark theme.
- KDE StatusNotifier tray registration, close-to-tray, and tray activation.
- KDE taskbar identity mapped to the packaged ChatGPT desktop file and icon.
- Codex CLI `0.144.0` app-server handshake.
- Chat, Codex, Plugins, Sites, project list, and composer rendering.
- Fcitx 5 is attached under the Wayland session.
- idle foreground CPU around 1–2% across main, GPU, renderer, and Codex in
  repeated 8–10 second samples after startup.
- empty `.git` directories do not trigger the Git-init polling loop.

## Performance regression check

Idle CPU was last compared on the same Kubuntu machine with ChatGPT
`26.707.72221` as the baseline and `26.707.91948` as the candidate. Each build
used its own temporary Electron profile, host configuration directory, Codex
home, application ID, and webview port. This prevents an active task or an
already-running application from contaminating the comparison.

After a 40-second settling period, `pidstat` sampled the launcher and its full
process tree for three consecutive 10-second intervals. Summing the per-process
`Average` CPU values produced approximately `0.47%` for the baseline and
`0.46%` for the candidate on the required repeat run. The candidate stayed
within measurement noise of the baseline, so the comparison passes.

For future updates, use the same machine, display backend, settling time,
isolated directories, and process-tree sampling. Treat a candidate as a likely
regression when its total average exceeds both the baseline by 25% and by 0.5
CPU percentage points. Repeat a failed comparison once before rejecting an
update, because short desktop samples can contain compositor or network noise.

Tray restoration was checked separately with two copies of the same
`26.707.61608` build and identical warmed profiles. Both copies shared the same
Electron and application files; only the tray icon permissions differed. Across
three paired full-process-tree samples, median proportional set size was
`481641 KiB` without a tray and `481782 KiB` with the restored tray, a `141 KiB`
(`0.03%`) difference. This is within measurement noise and passes the memory
regression check.

## Long-session safeguards

A 21-hour live X11 session reproduced two independent accumulation failures.
Two maximized ChatGPT windows occupied the same bounds, while both covered and
focused renderers continued using foreground CPU. The Codex app-server also
retained 17 idle `node_repl` children created across earlier browser-tool calls.
A restart cleared both symptoms but did not remove either cause.

The Linux build now guards those lifecycle boundaries:

- On X11, focusing one maximized top-level ChatGPT window minimizes another
  maximized window only when their bounds overlap by at least 95%. Side-by-side,
  multi-monitor, child, non-maximized, and Wayland windows are left unchanged.
- The official `node_repl` implementation runs behind a transparent supervisor.
  It terminates the helper process group after five minutes without protocol
  traffic only when no JSON-RPC request is pending. Parent-pipe closure also
  cleans it up immediately, while a pending long-running request disables the
  idle timeout until its response arrives.

The timeout can be changed with
`CHATGPT_NODE_REPL_IDLE_TIMEOUT_SECONDS`; invalid and non-positive values use
the five-minute default.

## Preserved from the official DMG

- Browser and Chrome resources, including Linux x64 native prebuilds.
- Sites, Deep Research, Visualize, and the platform-neutral part of LaTeX.
- official webview, skills, icons, and sound resources.

## Deliberately not shipped yet

- Computer Use and Record & Replay. Their official manifests and MCP commands
  are macOS-specific and point to Mach-O `.app` binaries. They require a real
  Linux adapter and independent tests.
- the bundled ARM64 macOS `tectonic` binary. The LaTeX plugin remains and may
  use a compatible system runtime.
- the Chrome macOS extension host.

## Not yet verified

- end-to-end execution of every preserved plugin;
- installation over every supported Ubuntu/Kubuntu release;
- `codex://` protocol registration, which the Debian package intentionally does
  not claim.
