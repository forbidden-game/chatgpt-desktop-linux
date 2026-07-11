# Compatibility status

This document distinguishes measured behavior from planned work. A visible UI
entry is not treated as proof that its Linux backend works.

## Build verified

- ChatGPT `26.707.41301` with Electron `42.1.0`.
- complete assembly with all three fail-closed Linux patches applied.
- deterministic Debian packaging and package-content smoke checks.

## Runtime verified on Kubuntu

The runtime checks below were last repeated with ChatGPT `26.707.30751` and
Electron `42.1.0`:

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
