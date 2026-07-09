# Architecture

## Decision

The build is ChatGPT-only. The previous Codex-derived repository is not an
oracle: it may suggest experiments, but no implementation crosses into this
repository without independent evidence.

## Truth hierarchy

1. Official DMG structure and metadata.
2. Behavior reproduced in an isolated Linux profile.
3. Acceptance and regression tests at this repository's interfaces.
4. Legacy source as an untrusted implementation hint.

When sources disagree, the higher source wins.

## Public interface

The intended interface is one command:

```bash
./build.sh /path/to/ChatGPT.dmg
```

It produces a versioned Debian package under `dist/`. All extraction, patching,
native-module work, Electron assembly, validation, and packaging stay behind
that interface.

## Internal modules

- **inspect** validates the DMG and reports immutable upstream facts.
- **assemble** creates a Linux application using the matching Electron runtime.
- **patch** contains only behavior justified by an observed failure and test.
- **package** turns a verified application directory into a Debian package.
- **verify** checks artifact structure and isolated runtime behavior.

These are internal seams, not user-facing extension systems. v1 has one distro
target and one package format, so it has no feature framework, package adapter
matrix, updater, or target-dispatch abstraction.

## Runtime principles

- Preserve upstream behavior unless Linux requires a change.
- Use an isolated Electron profile.
- Prefer native Wayland with GPU compositing.
- Keep X11 as an explicit compatibility choice.
- Do not modify the user's global input-method configuration.
- Do not patch optional product features without a reproduced Linux failure.

## Acceptance surface

Before replacing the installed stable build, the isolated v2 build must cover:

- launch, quit, relaunch, and single-instance behavior;
- Chat, Codex, Plugins, Sites, search, and file/project actions;
- Chinese input under Fcitx 5;
- native Wayland GPU ownership and absence of background polling loops;
- deterministic rebuild and Debian package inspection.
