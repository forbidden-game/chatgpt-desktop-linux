#!/usr/bin/env bash
set -Eeuo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./build.sh /path/to/ChatGPT.dmg"
  exit 0
fi

missing=()
for command in node npm python3 unzip dpkg-deb make g++ tar; do
  command -v "$command" >/dev/null || missing+=("$command")
done
if ! command -v 7zz >/dev/null && ! command -v 7z >/dev/null; then
  missing+=("7z or 7zz")
fi
if ((${#missing[@]})); then
  printf 'Missing build dependencies: %s\n' "${missing[*]}" >&2
  exit 1
fi
node_major="$(node -p 'process.versions.node.split(".")[0]')"
if ((node_major < 22)); then
  echo "Node.js 22 or newer is required to build (found $(node --version))" >&2
  exit 1
fi
if [[ "${1:-}" == "--check" || "${CHATGPT_CHECK_ONLY:-0}" == 1 ]]; then
  echo "build dependencies: ok"
  exit 0
fi
npm --prefix "$repo_dir" ci --ignore-scripts --no-audit --no-fund
exec node "$repo_dir/src/cli.mjs" build "$@"
