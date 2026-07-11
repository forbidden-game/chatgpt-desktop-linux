# ChatGPT Desktop for Linux

Run the official ChatGPT desktop experience on Ubuntu and Kubuntu with native
Wayland rendering, GPU compositing, and Linux desktop integration.

This is an unofficial, source-only compatibility builder. You provide an
official `ChatGPT.dmg`; the project inspects it and builds a local Linux x86_64
application plus a Debian package. OpenAI application binaries are never
committed to or redistributed by this repository.

> [!IMPORTANT]
> This independent project is not affiliated with, endorsed by, or supported
> by OpenAI. Updates are manual in v1.

## Why this port

- **Native Wayland and GPU by default.** The launcher does not disable GPU
  acceleration or the Electron renderer sandbox.
- **The ChatGPT product stays upstream.** The build preserves the official
  webview, Chat, Codex, Plugins, Sites, skills, icons, and sounds where their
  payloads are platform-neutral.
- **Linux desktop behavior is integrated.** KDE tray registration,
  close-to-tray, taskbar identity, application icon, and light/dark title-bar
  controls are patched at small, tested seams.
- **Chinese input works without changing the system input method.** Fcitx 5 is
  attached in the verified native Wayland setup.
- **The build fails closed.** Unexpected DMG layouts, version conflicts,
  native-module drift, checksum mismatches, or changed patch points stop the
  build instead of producing an unverified package.
- **The pipeline is ChatGPT-only.** It does not carry the previous Codex
  Desktop Linux framework as its product architecture.

## Verified status

| Area | Current status |
| --- | --- |
| Distribution | Kubuntu x86_64 verified; Ubuntu/Kubuntu x86_64 is the v1 target |
| Upstream app | ChatGPT `26.707.41301`, Electron `42.1.0`; build and Debian package verified |
| Display | Native Wayland + GPU verified; explicit X11 fallback available |
| Desktop shell | KDE tray, close-to-tray, taskbar identity, icon, and themed title controls verified |
| Input | Fcitx 5 Chinese input verified under Wayland |
| Product surfaces | Chat, Codex, Plugins, Sites, project list, and composer rendering verified |
| Codex backend | Codex CLI `0.144.0` app-server handshake verified |
| Idle CPU | About 1–2% total across main, GPU, renderer, and Codex processes in repeated 8–10 second post-startup samples on the test machine |
| Updates | Manual rebuild and package installation |

The runtime and CPU measurements were last repeated with ChatGPT
`26.707.30751`; the current `26.707.41301` baseline has passed the complete
build and package smoke checks. See [compatibility status](docs/compatibility.md)
for the complete tested surface and explicit limitations.

## Install

### 1. Get the source

Clone this repository:

```bash
git clone https://github.com/forbidden-game/chatgpt-desktop-linux.git
cd chatgpt-desktop-linux
```

### 2. Install build dependencies

Node.js 22 or newer is required to build:

```bash
sudo apt update
sudo apt install build-essential 7zip unzip nodejs npm python3 dpkg-dev curl
node --version
./build.sh --check
```

If your distribution provides an older Node.js, install Node.js 22 or newer
from a trusted source before running the check.

Install the [official Codex CLI](https://github.com/openai/codex) and make sure
the `codex` executable is in `~/.local/bin`, `/usr/local/bin`, or `/usr/bin`:

```bash
npm install -g @openai/codex@latest
codex --version
command -v codex
```

Codex CLI `0.144.0` is the currently verified backend. A newer CLI may work,
but is not claimed as verified until it passes the app-server handshake. If the
executable lives elsewhere, launch with
`CHATGPT_CODEX_CLI_PATH=/path/to/codex`.

### One-command download, build, and install

After the dependencies above are installed, run:

```bash
./install.sh
```

The script downloads the latest official Electron DMG into a temporary
directory, runs the fail-closed build, and installs the Debian package produced
by that build. It does not stop or restart an already running ChatGPT process;
restart the app yourself when convenient.

The remaining steps show the equivalent manual workflow.

### 3. Download the official DMG

`download.sh` fetches the current official Electron-based ChatGPT DMG from
OpenAI's [`codex-app-prod` channel](https://persistent.oaistatic.com/codex-app-prod/ChatGPT.dmg)
and saves it to `$HOME/Downloads/ChatGPT.dmg`:

```bash
./download.sh
```

It refuses to overwrite an existing file. Pass another destination when you
want to preserve an older download:

```bash
./download.sh "$HOME/Downloads/ChatGPT-latest.dmg"
```

The DMG remains a local input to the build and is ignored by Git; it is not
committed to or redistributed by this repository.

### 4. Build the Debian package

```bash
./build.sh "$HOME/Downloads/ChatGPT.dmg"
```

The builder:

1. inspects the DMG and records its immutable metadata and SHA-256;
2. downloads the matching Linux Electron runtime and verifies its official
   checksum;
3. rebuilds the exact upstream native-module versions for Linux;
4. applies only the tested Linux compatibility patches; and
5. emits a deterministic, versioned `.deb` under `dist/`.

A newer ChatGPT DMG is accepted only when its Electron version, native modules,
archive structure, and patch points still satisfy these checks.

### 5. Install and launch

```bash
sudo apt install ./dist/chatgpt-desktop_*_amd64.deb
```

Open **ChatGPT** from the application menu or run:

```bash
chatgpt-desktop
```

Wayland is the default. If a driver, compositor, or input-method issue requires
X11/XWayland, use the explicit fallback:

```bash
chatgpt-desktop --x11
```

The isolated application profile lives at:

```text
~/.local/state/chatgpt-desktop/profile-v1
```

It does not reuse state from Codex Desktop or older compatibility builds.

## Update or remove

v1 intentionally performs no background update. To update, pull the current
builder, supply the new official DMG, and install the newly generated package:

```bash
git pull --ff-only
./build.sh "$HOME/Downloads/ChatGPT.dmg"
sudo apt install ./dist/chatgpt-desktop_*_amd64.deb
```

Remove the installed package with:

```bash
sudo apt remove chatgpt-desktop
```

Package removal does not delete the isolated profile automatically.

## Reliability model

This project treats the official DMG as data to verify, not as a stable archive
shape to assume.

- Electron downloads are matched to the upstream version and SHA-256 verified.
- Native dependencies are version-pinned from the inspected ASAR and rebuilt
  from source for the matching Electron ABI.
- Source patches are exact and idempotent; upstream drift is an error.
- Ambiguous or incomplete application archives are rejected.
- The local webview binds only to `127.0.0.1`, uses a health check, and disables
  caching.
- Builds record source hashes, runtime hashes, native versions, and applied
  patches in `resources/chatgpt-linux-build.json`.
- Debian packaging normalizes timestamps for deterministic output from the same
  freshly assembled application.

Repository checks:

```bash
npm test
npm run check
```

## Current limitations

- v1 supports Linux x86_64 only.
- Ubuntu/Kubuntu is the current package target; other distributions are not
  claimed as supported.
- X11 fallback is covered by launcher tests but has not received the same live
  end-to-end validation as Wayland.
- Computer Use and Record & Replay are not shipped because their current
  official payloads are macOS-specific.
- Not every preserved plugin has completed end-to-end Linux verification.
- The package does not register the `codex://` protocol.
- Application updates are manual.

## Source and legal boundary

Do not commit a DMG, extracted ChatGPT application, OpenAI icon, patched ASAR,
generated package, profile, logs containing user data, or `~/.codex` content.

See [architecture](docs/architecture.md) for the truth hierarchy and module
design, and [notices](NOTICE.md) for attribution and trademark details.
