#!/usr/bin/env bash
set -Eeuo pipefail

app_dir="${CHATGPT_APP_DIR:-$(cd "$(dirname "$0")" && pwd)}"
app_id="${CHATGPT_APP_ID:-chatgpt-desktop}"
state_dir="${CHATGPT_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/$app_id/profile-v1}"
host_config_home="${CHATGPT_HOST_CONFIG_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}}"
if [[ "$host_config_home" == "$state_dir/xdg-config" ]]; then
  host_config_home="$HOME/.config"
fi
webview_port="${CHATGPT_WEBVIEW_PORT:-5186}"
display_backend="${CHATGPT_DISPLAY_BACKEND:-wayland}"
electron_args=()
export PATH="${CHATGPT_USER_PATH:-$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin}"

while (($#)); do
  case "$1" in
    --x11) display_backend=x11 ;;
    --wayland) display_backend=wayland ;;
    *) electron_args+=("$1") ;;
  esac
  shift
done

case "$display_backend" in
  wayland)
    electron_args=(
      --ozone-platform=wayland
      --enable-features=WaylandWindowDecorations
      "${electron_args[@]}"
    )
    ;;
  x11)
    electron_args=(--ozone-platform=x11 "${electron_args[@]}")
    ;;
  *)
    echo "Unsupported display backend: $display_backend" >&2
    exit 2
    ;;
esac

CODEX_CLI_PATH="${CHATGPT_CODEX_CLI_PATH:-}"
if [[ -z "$CODEX_CLI_PATH" ]]; then
  for candidate in "$HOME/.local/bin/codex" /usr/local/bin/codex /usr/bin/codex; do
    if [[ -x "$candidate" ]]; then
      CODEX_CLI_PATH="$candidate"
      break
    fi
  done
fi

export CODEX_CLI_PATH
export CODEX_HOME="${CHATGPT_CODEX_HOME:-$HOME/.codex}"
export CODEX_ELECTRON_RESOURCES_PATH="$app_dir/resources"
export CODEX_ELECTRON_BUNDLED_PLUGINS_RESOURCES_PATH="$app_dir/resources/plugins/openai-bundled"
export CODEX_LINUX_APP_ID="$app_id"
export CODEX_LINUX_APP_DISPLAY_NAME=ChatGPT
export CODEX_LINUX_APP_STATE_DIR="$state_dir"
export CODEX_NODE_REPL_PATH="${CHATGPT_NODE_REPL_PATH:-$app_dir/resources/node_repl}"
export CODEX_SHELL=1
export ELECTRON_RENDERER_URL="http://127.0.0.1:$webview_port/"
# Electron and Codex have explicit profile directories. Keep the host XDG
# directory so external applications inherit the user's real configuration.
export XDG_CONFIG_HOME="$host_config_home"

CODEX_BROWSER_USE_NODE_PATH="${CHATGPT_NODE_PATH:-}"
if [[ -z "$CODEX_BROWSER_USE_NODE_PATH" ]]; then
  for candidate in /usr/local/bin/node /usr/bin/node; do
    if [[ -x "$candidate" ]]; then
      CODEX_BROWSER_USE_NODE_PATH="$candidate"
      break
    fi
  done
fi
export CODEX_BROWSER_USE_NODE_PATH="${CODEX_BROWSER_USE_NODE_PATH:-}"
export NODE_REPL_NODE_PATH="$CODEX_BROWSER_USE_NODE_PATH"

electron_args=(
  --class="$app_id"
  --app-id="$app_id"
  --user-data-dir="$state_dir/electron-user-data"
  "${electron_args[@]}"
)

if [[ "${CHATGPT_DRY_RUN:-0}" == 1 ]]; then
  printf '%s\n' \
    "CODEX_CLI_PATH=$CODEX_CLI_PATH" \
    "CODEX_BROWSER_USE_NODE_PATH=$CODEX_BROWSER_USE_NODE_PATH" \
    "CODEX_HOME=$CODEX_HOME" \
    "CODEX_NODE_REPL_PATH=$CODEX_NODE_REPL_PATH" \
    "ELECTRON_RENDERER_URL=$ELECTRON_RENDERER_URL" \
    "XDG_CONFIG_HOME=$XDG_CONFIG_HOME"
  printf 'COMMAND=%q' "$app_dir/chatgpt-desktop"
  printf ' %q' "${electron_args[@]}"
  printf '\n'
  exit 0
fi

[[ -x "$app_dir/chatgpt-desktop" ]] || {
  echo "Missing Linux Electron runtime: $app_dir/chatgpt-desktop" >&2
  exit 1
}
[[ -f "$app_dir/content/webview/index.html" ]] || {
  echo "Missing ChatGPT webview: $app_dir/content/webview" >&2
  exit 1
}
[[ -n "$CODEX_CLI_PATH" && -x "$CODEX_CLI_PATH" ]] || {
  echo "Codex CLI not found; set CHATGPT_CODEX_CLI_PATH" >&2
  exit 1
}
command -v python3 >/dev/null || {
  echo "python3 is required to serve the local webview" >&2
  exit 1
}
command -v flock >/dev/null || {
  echo "flock is required to coordinate ChatGPT instances" >&2
  exit 1
}
command -v setsid >/dev/null || {
  echo "setsid is required to isolate the ChatGPT process group" >&2
  exit 1
}
[[ -f "$app_dir/.chatgpt-linux/webview_server.py" ]] || {
  echo "Missing ChatGPT webview server" >&2
  exit 1
}

mkdir -p "$state_dir" "$XDG_CONFIG_HOME"
exec 9>"$state_dir/launcher.lock"
if ! flock -n 9; then
  cd "$app_dir"
  exec "$app_dir/chatgpt-desktop" "${electron_args[@]}"
fi

webview_log="$state_dir/webview.log"
electron_pid=""
health_token="$$-${RANDOM:-0}"
python3 "$app_dir/.chatgpt-linux/webview_server.py" \
  --bind 127.0.0.1 --port "$webview_port" \
  --directory "$app_dir/content/webview" --health-token "$health_token" \
  >>"$webview_log" 2>&1 &
webview_pid=$!

# shellcheck disable=SC2329 # Invoked by EXIT and signal handlers.
cleanup() {
  if [[ -n "$electron_pid" ]] && kill -0 -- "-$electron_pid" 2>/dev/null; then
    kill -TERM -- "-$electron_pid" 2>/dev/null || true
    for _ in {1..20}; do
      kill -0 -- "-$electron_pid" 2>/dev/null || break
      sleep 0.1
    done
    kill -KILL -- "-$electron_pid" 2>/dev/null || true
  fi
  [[ -z "$electron_pid" ]] || wait "$electron_pid" 2>/dev/null || true
  electron_pid=""
  kill "$webview_pid" 2>/dev/null || true
  wait "$webview_pid" 2>/dev/null || true
}
# shellcheck disable=SC2329 # Invoked by INT and TERM handlers.
terminate() {
  trap - EXIT
  cleanup
  exit 0
}
trap cleanup EXIT
trap terminate INT TERM

webview_ready=0
for _ in {1..50}; do
  if [[ "$(curl --fail --silent --max-time 0.2 \
    "${ELECTRON_RENDERER_URL}__chatgpt_linux_health__" 2>/dev/null || true)" == "$health_token" ]]; then
    webview_ready=1
    break
  fi
  if ! kill -0 "$webview_pid" 2>/dev/null; then
    echo "Webview server failed; see $webview_log" >&2
    exit 1
  fi
  sleep 0.1
done
if [[ "$webview_ready" != 1 ]]; then
  echo "Webview server did not become ready; see $webview_log" >&2
  exit 1
fi

cd "$app_dir"
setsid "$app_dir/chatgpt-desktop" "${electron_args[@]}" &
electron_pid=$!
set +e
wait "$electron_pid"
status=$?
set -e
exit "$status"
