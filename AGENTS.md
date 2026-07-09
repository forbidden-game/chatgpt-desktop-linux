# AGENTS.md

## Product

This repository builds an unofficial Linux package from a user-supplied
official `ChatGPT.dmg`. It does not redistribute OpenAI application payloads.

## Scope

- Target Ubuntu/Kubuntu x86_64 first.
- Produce a local app and a Debian package.
- Default to native Wayland with GPU compositing; keep an explicit X11 fallback.
- Updates are manual in v1.

## Truth hierarchy

1. The current official ChatGPT DMG and its metadata.
2. Reproducible behavior observed from isolated Linux builds.
3. Tests written against the public build and runtime interfaces.
4. The adjacent legacy repository, which is only a source of hypotheses.

Never port legacy behavior without a failing test or an observed requirement.
Keep the public interface small and the implementation readable.

## Validation

- Run `npm test` while changing JavaScript.
- Run `npm run check` before committing.
- Build with a user-supplied DMG and run package smoke checks before release.
