# ChatGPT Desktop for Linux

An unofficial, source-only compatibility builder for the official ChatGPT
desktop application. You provide `ChatGPT.dmg`; this project creates a local
Linux x86_64 application and Debian package without redistributing OpenAI
application binaries.

This repository is being rebuilt around ChatGPT itself. It does not use the
Codex Desktop Linux build framework as its product architecture.

## v1 contract

- Ubuntu/Kubuntu x86_64
- native Wayland and GPU compositing by default
- explicit X11 fallback
- isolated ChatGPT Electron profile
- local Codex CLI backend discovery
- manual application updates
- one build command that emits a `.deb`

The build command will be documented once the new pipeline passes the first
end-to-end build.

## Source boundary

Do not commit a DMG, extracted ChatGPT application, OpenAI icon, patched ASAR,
generated package, profile, logs containing user data, or `~/.codex` content.

See [architecture](docs/architecture.md) for the truth hierarchy and module
design.
