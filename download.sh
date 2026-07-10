#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./download.sh [output.dmg]"
  exit 0
fi
if (($# > 1)); then
  echo "Usage: ./download.sh [output.dmg]" >&2
  exit 2
fi

command -v curl >/dev/null || {
  echo "curl is required to download the official ChatGPT DMG" >&2
  exit 1
}

url="${CHATGPT_DMG_URL:-https://persistent.oaistatic.com/codex-app-prod/ChatGPT.dmg}"
output="${1:-${HOME:?HOME is required}/Downloads/ChatGPT.dmg}"
if [[ -e "$output" ]]; then
  echo "Refusing to overwrite existing file: $output" >&2
  exit 1
fi

mkdir -p "$(dirname "$output")"
partial="${output}.part.$$"
cleanup() {
  rm -f "$partial"
}
trap cleanup EXIT

curl --fail --location --retry 3 --output "$partial" "$url"
mv "$partial" "$output"
trap - EXIT
printf 'Saved official ChatGPT DMG to %s\n' "$output"
