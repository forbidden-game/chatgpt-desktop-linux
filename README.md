# ChatGPT Desktop for Linux

Latest supported ChatGPT app: **July 13, 2026** (`26.707.61608`).

Unofficial, source-only builder for running the official Electron-based ChatGPT
desktop app on Ubuntu and Kubuntu x86_64.

## Quick install

```bash
git clone https://github.com/forbidden-game/chatgpt-desktop-linux.git
cd chatgpt-desktop-linux
./install.sh
```

Run `install.sh` as your normal desktop user, not with `sudo`. The installer
announces each step, identifies the failed step, and requests administrator
access only for APT operations. It does not restart a running ChatGPT process.

The installer:

- installs system build and runtime dependencies;
- verifies the system Node.js runtime and provides a SHA-256-verified Node.js
  22 build runtime when needed;
- installs or locates the official Codex CLI without overwriting user-managed
  executables or links;
- downloads the latest official Electron DMG;
- applies the tested Linux compatibility patches and builds a Debian package;
- installs the freshly built package.

> [!IMPORTANT]
> This independent project is not affiliated with or supported by OpenAI. It
> does not commit or redistribute OpenAI application binaries. A long build may
> outlive the sudo timeout and request your password again during installation.

## Status

| Area | Verified status |
| --- | --- |
| Target | Ubuntu/Kubuntu x86_64 |
| Upstream | ChatGPT `26.707.61608`, Electron `42.1.0` |
| Display | Native Wayland + GPU; explicit X11 fallback |
| Desktop | KDE tray, close-to-tray, taskbar identity, icon, Fcitx 5 |

See [compatibility status](docs/compatibility.md) for the full tested surface
and limitations.

## Launch

Open **ChatGPT** from the application menu or run:

```bash
chatgpt-desktop
```

Use X11/XWayland only when needed:

```bash
chatgpt-desktop --x11
```

The isolated profile is stored under
`~/.local/state/chatgpt-desktop/profile-v1`.

## Manual workflow

Download the current official Electron DMG:

```bash
./download.sh
```

Build and install it:

```bash
./build.sh --check
./build.sh "$HOME/Downloads/ChatGPT.dmg"
sudo apt install ./dist/chatgpt-desktop_*_amd64.deb
```

The build fails closed on unexpected archive layouts, checksum mismatches,
native-module drift, or changed patch points.

## Update or remove

```bash
git pull --ff-only
./install.sh
```

The installer updates files on disk without restarting the running app. Restart
ChatGPT yourself when convenient.

Remove the package with:

```bash
sudo apt remove chatgpt-desktop
```

Package removal does not delete the isolated profile.

## Current limitations

- Linux x86_64 and Ubuntu/Kubuntu are the current supported target.
- X11 has less live validation than Wayland.
- Computer Use and Record & Replay are omitted while their official payloads
  remain macOS-specific.
- Not every preserved plugin has completed end-to-end Linux validation.
- Updates are manual.

## Source boundary

Do not commit DMGs, extracted applications, OpenAI assets, patched ASARs,
generated packages, profiles, logs containing user data, or `~/.codex`.

See [architecture](docs/architecture.md) for the design and truth hierarchy,
and [notices](NOTICE.md) for attribution and trademark details.
