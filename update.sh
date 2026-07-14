#!/usr/bin/env bash
set -Eeuo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./update.sh"
  exit 0
fi
if (($# > 0)); then
  echo "Usage: ./update.sh" >&2
  exit 2
fi

echo "[1/2] Updating the source checkout"
git -C "$repo_dir" pull --ff-only

echo
echo "[2/2] Building and installing the updated app"
exec "$repo_dir/install.sh"
