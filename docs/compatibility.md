# Compatibility status

This document distinguishes measured behavior from planned work. A visible UI
entry is not treated as proof that its Linux backend works.

## Build verified

- ChatGPT `26.707.61608` with Electron `42.1.0`.
- complete assembly with all five fail-closed Linux patches applied.
- deterministic Debian packaging and package-content smoke checks.

## Runtime verified on Kubuntu

An isolated packaged-runtime smoke test was repeated with ChatGPT
`26.707.61608` and Electron `42.1.0`. It verified native Wayland startup, GPU
render-node ownership, the Electron renderer sandbox, local webview health, and
the Codex CLI `0.144.1` app-server handshake.

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
`26.707.41301` as the baseline and `26.707.51957` as the candidate. Each build
used its own temporary Electron profile, host configuration directory, Codex
home, application ID, and webview port. This prevents an active task or an
already-running application from contaminating the comparison.

After a 40-second settling period, `pidstat` sampled the launcher and its full
process tree for three consecutive 10-second intervals. Summing the per-process
`Average` CPU values produced approximately `1.03%` for the baseline and
`0.83%` for the candidate. This is a pass: the candidate did not regress from
the measured baseline or the established 1–2% idle reference range.

For future updates, use the same machine, display backend, settling time,
isolated directories, and process-tree sampling. Treat a candidate as a likely
regression when its total average exceeds both the baseline by 25% and by 0.5
CPU percentage points. Repeat a failed comparison once before rejecting an
update, because short desktop samples can contain compositor or network noise.

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
- live X11 fallback beyond launcher argument tests;
- installation over every supported Ubuntu/Kubuntu release;
- `codex://` protocol registration, which the Debian package intentionally does
  not claim.
