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

The default profile lives under
`~/.local/state/chatgpt-desktop/profile-v1`, so it does not reuse state from
older compatibility builds.

## Build

Install Ubuntu/Kubuntu build dependencies (Node.js 22 or newer is required to
build):

```bash
sudo apt install build-essential 7zip unzip nodejs npm python3 dpkg-dev
./build.sh --check
```

Then run:

```bash
./build.sh ~/Downloads/ChatGPT.dmg
```

The current verified upstream release is `26.707.30751`. A newer DMG is
accepted only while its inspected Electron, native modules, and patch points
still satisfy the repository's fail-closed checks.

The versioned package is written to `dist/`. Install or update it manually:

```bash
sudo apt install ./dist/chatgpt-desktop_*_amd64.deb
```

The installed runtime requires a separately installed Codex CLI. Set
`CHATGPT_CODEX_CLI_PATH` when it is not in `~/.local/bin`, `/usr/local/bin`, or
`/usr/bin`. ChatGPT-specific overrides avoid inheriting paths from another
desktop application. `CHATGPT_CODEX_HOME` can select a different Codex data
directory; its default remains `~/.codex`.

See [compatibility status](docs/compatibility.md) for measured features and
explicit limitations.

## Source boundary

Do not commit a DMG, extracted ChatGPT application, OpenAI icon, patched ASAR,
generated package, profile, logs containing user data, or `~/.codex` content.

See [architecture](docs/architecture.md) for the truth hierarchy and module
design.
