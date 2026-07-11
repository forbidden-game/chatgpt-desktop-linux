#!/usr/bin/env bash
set -Eeuo pipefail

repo_dir="$(cd "$(dirname "$0")" && pwd)"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: ./install.sh"
  exit 0
fi
if (($# > 0)); then
  echo "Usage: ./install.sh" >&2
  exit 2
fi

command -v sudo >/dev/null || {
  echo "sudo is required to install the Debian package" >&2
  exit 1
}
command -v apt-get >/dev/null || {
  echo "apt-get is required to install the Debian package" >&2
  exit 1
}

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/chatgpt-linux-install.XXXXXX")"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

dmg="$work_dir/ChatGPT.dmg"
build_marker="$work_dir/build-started"

"$repo_dir/download.sh" "$dmg"
touch "$build_marker"
"$repo_dir/build.sh" "$dmg"

packages=()
while IFS= read -r -d '' package; do
  packages+=("$package")
done < <(find "$repo_dir/dist" -maxdepth 1 -type f \
  -name 'chatgpt-desktop_*_amd64.deb' -newer "$build_marker" -print0)

if ((${#packages[@]} != 1)); then
  echo "Expected one freshly built Debian package, found ${#packages[@]}" >&2
  exit 1
fi

package="${packages[0]}"
sudo apt-get install --yes "$package"
printf 'Installed %s\n' "$(basename "$package")"
echo "Running ChatGPT processes were not restarted; restart the app when convenient."
