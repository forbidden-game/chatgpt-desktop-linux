import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const launcher = new URL("../runtime/launch.sh", import.meta.url);

async function dryRun(args = []) {
  const { stdout } = await execFileAsync("bash", [launcher.pathname, ...args], {
    env: {
      ...process.env,
      CHATGPT_APP_DIR: "/tmp/chatgpt-app",
      CHATGPT_APP_ID: "chatgpt-desktop-v2",
      CHATGPT_CODEX_CLI_PATH: "/bin/true",
      CHATGPT_DRY_RUN: "1",
      CODEX_BROWSER_USE_NODE_PATH: "/opt/chatgpt-desktop/resources/node-runtime/bin/node",
      CODEX_CLI_PATH: "/opt/codex-desktop/resources/codex",
      CODEX_HOME: "/opt/codex-desktop/home",
      HOME: "/tmp/chatgpt-home",
    },
  });
  return stdout;
}

test("launcher defaults to native Wayland with an isolated profile", async () => {
  const output = await dryRun();
  assert.match(output, /ELECTRON_RENDERER_URL=http:\/\/127\.0\.0\.1:5186\//);
  assert.match(output, /XDG_CONFIG_HOME=\/tmp\/chatgpt-home\/\.local\/state\/chatgpt-desktop-v2\/profile-v1\/xdg-config/);
  assert.match(output, /--user-data-dir=\/tmp\/chatgpt-home\/\.local\/state\/chatgpt-desktop-v2\/profile-v1\/electron-user-data/);
  assert.match(output, /--ozone-platform=wayland/);
  assert.match(output, /--enable-features=WaylandWindowDecorations/);
  assert.match(output, /CODEX_BROWSER_USE_NODE_PATH=\/usr\/bin\/node/);
  assert.match(output, /CODEX_CLI_PATH=\/bin\/true/);
  assert.match(output, /CODEX_HOME=\/tmp\/chatgpt-home\/\.codex/);
  assert.doesNotMatch(output, /--disable-gpu|--no-sandbox/);
  assert.doesNotMatch(output, /\/opt\/(?:codex|chatgpt)-desktop/);
  assert.match(output, /COMMAND=\/tmp\/chatgpt-app\/chatgpt-desktop/);
});

test("launcher exposes an explicit X11 fallback", async () => {
  const output = await dryRun(["--x11", "--inspect"]);
  assert.match(output, /--ozone-platform=x11/);
  assert.match(output, /--inspect/);
  assert.doesNotMatch(output, /--ozone-platform=wayland/);
});

test("launcher stays ChatGPT-specific and compact", async () => {
  const source = await readFile(launcher, "utf8");
  assert.ok(source.split("\n").length < 200);
  assert.match(source, /terminate\(\).*?trap - EXIT.*?cleanup.*?exit 0/su);
  assert.doesNotMatch(source, /update.manager|linux.features|bootstrap.wizard/iu);
});
