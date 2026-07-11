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

total_steps=8
step_number=0
current_step="Preparing the installer"
work_dir=""
root_command=()

cleanup() {
  if [[ -n "$work_dir" ]]; then
    rm -rf "$work_dir"
  fi
}
trap cleanup EXIT

report_error() {
  status=$?
  trap - ERR
  printf '\nERROR: Step %d/%d failed: %s (exit %d).\n' \
    "$step_number" "$total_steps" "$current_step" "$status" >&2
  echo "Resolve the message above, then run ./install.sh again." >&2
  exit "$status"
}
trap report_error ERR

begin_step() {
  step_number=$((step_number + 1))
  current_step="$1"
  printf '\n[%d/%d] %s\n' "$step_number" "$total_steps" "$current_step"
}

fail_step() {
  echo "$1" >&2
  return 1
}

ensure_node_build_runtime() {
  local node_major=""
  if command -v node >/dev/null && command -v npm >/dev/null; then
    node_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"
  fi
  if [[ ! "$node_major" =~ ^[0-9]+$ ]] || ((node_major < 22)); then
    local sums="$work_dir/SHASUMS256.txt"
    local sums_url="${CHATGPT_NODE_SHASUMS_URL:-https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt}"
    local dist_base="${CHATGPT_NODE_DIST_BASE:-https://nodejs.org/dist}"
    curl --fail --location --retry 3 --output "$sums" "$sums_url"

    local node_archive
    node_archive="$(awk '$2 ~ /^node-v22\.[0-9.]+-linux-x64\.tar\.xz$/ { print $2; exit }' "$sums")"
    [[ -n "$node_archive" ]] || fail_step "The Node.js checksum list has no Linux x64 archive."
    local expected_sha256
    expected_sha256="$(awk -v archive="$node_archive" '$2 == archive { print $1; exit }' "$sums")"
    local node_release="${node_archive%-linux-x64.tar.xz}"
    local node_version="${node_release#node-}"
    local archive_path="$work_dir/$node_archive"
    curl --fail --location --retry 3 --output "$archive_path" \
      "${dist_base%/}/$node_version/$node_archive"
    local actual_sha256
    actual_sha256="$(sha256sum "$archive_path" | awk '{ print $1 }')"
    if [[ "$actual_sha256" != "$expected_sha256" ]]; then
      fail_step "Node.js archive checksum verification failed."
    fi

    local node_dir="${HOME:?HOME is required}/.local/share/chatgpt-desktop-linux/$node_release"
    if [[ -e "$node_dir" && ! -x "$node_dir/bin/node" ]]; then
      fail_step "Existing Node.js directory is incomplete: $node_dir"
    fi
    if [[ ! -x "$node_dir/bin/node" ]]; then
      local staging="$work_dir/$node_release"
      mkdir -p "$staging" "$(dirname "$node_dir")"
      tar -xJf "$archive_path" --strip-components=1 -C "$staging"
      mv "$staging" "$node_dir"
    fi
    export PATH="$node_dir/bin:$PATH"
    hash -r
  fi

  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if ((node_major < 22)) || ! command -v npm >/dev/null; then
    fail_step "Node.js 22+ and npm are required after dependency setup."
  fi
  echo "Using $(node --version) from $(command -v node)"
}

find_working_codex() {
  local path_codex=""
  path_codex="$(command -v codex 2>/dev/null || true)"
  local candidate
  for candidate in \
    "$HOME/.local/bin/codex" \
    /usr/local/bin/codex \
    /usr/bin/codex \
    "$path_codex"; do
    if [[ -n "$candidate" && -x "$candidate" ]] && "$candidate" --version >/dev/null 2>&1; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done
  return 1
}

ensure_launcher_codex_path() {
  local codex_source="$1"
  local codex_link="$HOME/.local/bin/codex"
  case "$codex_source" in
    "$codex_link" | /usr/local/bin/codex | /usr/bin/codex) return 0 ;;
  esac

  mkdir -p "$(dirname "$codex_link")"
  if [[ -L "$codex_link" ]]; then
    local existing_target
    existing_target="$(readlink "$codex_link")"
    if [[ "$existing_target" != "$codex_source" ]]; then
      fail_step "Refusing to replace user-managed Codex link: $codex_link -> $existing_target"
    fi
    return 0
  fi
  if [[ -e "$codex_link" ]]; then
    fail_step "Refusing to replace existing Codex executable: $codex_link"
  fi
  ln -s "$codex_source" "$codex_link"
}

ensure_codex_cli() {
  local codex_source=""
  if ! codex_source="$(find_working_codex)"; then
    local codex_prefix="${HOME:?HOME is required}/.local/share/chatgpt-desktop-linux/codex"
    npm install --prefix "$codex_prefix" --no-audit --no-fund @openai/codex@latest
    codex_source="$codex_prefix/node_modules/.bin/codex"
    [[ -x "$codex_source" ]] || fail_step "The Codex CLI package did not provide an executable."
  fi

  ensure_launcher_codex_path "$codex_source"
  export PATH="$HOME/.local/bin:$PATH"
  hash -r
  echo "Using $("$codex_source" --version) from $codex_source"
}

begin_step "Checking supported system and administrator access"
command -v apt-get >/dev/null || fail_step "apt-get is required; use Ubuntu or Debian."
architecture="$(dpkg --print-architecture 2>/dev/null || uname -m)"
if [[ "$architecture" != "amd64" && "$architecture" != "x86_64" ]]; then
  fail_step "Unsupported architecture: $architecture (expected amd64/x86_64)."
fi
if ((EUID == 0)); then
  fail_step "Do not run this script with sudo or as root; run ./install.sh as the desktop user."
fi
command -v sudo >/dev/null || fail_step "sudo is required to install system packages."
sudo --validate
root_command=(sudo)
work_dir="$(mktemp -d "${TMPDIR:-/tmp}/chatgpt-linux-install.XXXXXX")"
echo "System check passed; temporary work directory: $work_dir"

begin_step "Refreshing system package metadata"
"${root_command[@]}" apt-get update

begin_step "Installing system build and runtime dependencies"
"${root_command[@]}" apt-get install --yes \
  build-essential 7zip unzip python3 dpkg-dev curl ca-certificates \
  xz-utils tar nodejs npm git util-linux xdg-utils
system_node_package_version="$(dpkg-query -W -f='${Version}' nodejs 2>/dev/null || true)"
if [[ -z "$system_node_package_version" ]] || \
  ! dpkg --compare-versions "$system_node_package_version" ge 18; then
  fail_step "The configured APT repository must provide nodejs 18 or newer for the installed app."
fi
echo "System nodejs package satisfies the runtime dependency: $system_node_package_version"

begin_step "Ensuring Node.js 22 or newer"
ensure_node_build_runtime

begin_step "Ensuring the official Codex CLI is available"
ensure_codex_cli

dmg="$work_dir/ChatGPT.dmg"
build_marker="$work_dir/build-started"

begin_step "Downloading the latest official Electron DMG"
"$repo_dir/download.sh" "$dmg"

begin_step "Building the Debian package"
touch "$build_marker"
"$repo_dir/build.sh" "$dmg"

packages=()
while IFS= read -r -d '' package; do
  packages+=("$package")
done < <(find "$repo_dir/dist" -maxdepth 1 -type f \
  -name 'chatgpt-desktop_*_amd64.deb' -newer "$build_marker" -print0)

if ((${#packages[@]} != 1)); then
  fail_step "Expected one freshly built Debian package, found ${#packages[@]}."
fi

begin_step "Installing the freshly built Debian package"
package="${packages[0]}"
"${root_command[@]}" apt-get install --yes "$package"
printf 'Installed %s\n' "$(basename "$package")"
echo "Running ChatGPT processes were not restarted; restart the app when convenient."
