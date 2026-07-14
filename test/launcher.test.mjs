import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const launcher = new URL("../runtime/launch.sh", import.meta.url);

async function dryRun(args = [], env = {}) {
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
      XDG_CONFIG_DIRS: "/tmp/system-config",
      XDG_CONFIG_HOME: "/tmp/chatgpt-host-config",
      XDG_SESSION_TYPE: "wayland",
      ...env,
    },
  });
  return stdout;
}

test("launcher defaults to native Wayland with an isolated profile", async () => {
  const output = await dryRun();
  assert.match(output, /ELECTRON_RENDERER_URL=http:\/\/127\.0\.0\.1:5186\//);
  assert.match(output, /XDG_CONFIG_HOME=\/tmp\/chatgpt-host-config/);
  assert.match(output, /--user-data-dir=\/tmp\/chatgpt-home\/\.local\/state\/chatgpt-desktop-v2\/profile-v1\/electron-user-data/);
  assert.match(output, /--ozone-platform=wayland/);
  assert.match(output, /--enable-features=WaylandWindowDecorations/);
  assert.match(output, /CODEX_BROWSER_USE_NODE_PATH=\/usr\/bin\/node/);
  assert.match(output, /CODEX_CLI_PATH=\/bin\/true/);
  assert.match(output, /CODEX_HOME=\/tmp\/chatgpt-home\/\.codex/);
  assert.match(output, /CODEX_NODE_REPL_PATH=\/tmp\/chatgpt-app\/resources\/node_repl/);
  assert.doesNotMatch(output, /--disable-gpu|--no-sandbox/);
  assert.doesNotMatch(output, /\/opt\/(?:codex|chatgpt)-desktop/);
  assert.match(output, /COMMAND=\/tmp\/chatgpt-app\/chatgpt-desktop/);
});

test("launcher does not pass its old isolated XDG directory to external apps", async () => {
  const output = await dryRun([], {
    XDG_CONFIG_HOME: "/tmp/chatgpt-home/.local/state/chatgpt-desktop-v2/profile-v1/xdg-config",
  });
  assert.match(output, /XDG_CONFIG_HOME=\/tmp\/chatgpt-home\/\.config/);
});

test("launcher exposes an explicit X11 fallback", async () => {
  const output = await dryRun(["--x11", "--inspect"]);
  assert.match(output, /--ozone-platform=x11/);
  assert.match(output, /--inspect/);
  assert.doesNotMatch(output, /--ozone-platform=wayland/);
});

test("launcher follows an X11 desktop session by default", async () => {
  const output = await dryRun([], { XDG_SESSION_TYPE: "x11" });
  assert.match(output, /--ozone-platform=x11/);
  assert.doesNotMatch(output, /--ozone-platform=wayland/);
});

test("explicit Wayland selection overrides an X11 desktop session", async () => {
  const output = await dryRun(["--wayland"], { XDG_SESSION_TYPE: "x11" });
  assert.match(output, /--ozone-platform=wayland/);
  assert.match(output, /--enable-features=WaylandWindowDecorations/);
  assert.doesNotMatch(output, /--ozone-platform=x11/);
});

test("launcher cleans the Electron process group after its leader exits", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "chatgpt-launcher-test-"));
  const appDir = join(root, "app");
  const childPidFile = join(root, "child.pid");
  const stateDir = join(root, "state");
  const port = 20_000 + Math.floor(Math.random() * 20_000);
  t.after(() => rm(root, { force: true, recursive: true }));

  await mkdir(join(appDir, ".chatgpt-linux"), { recursive: true });
  await mkdir(join(appDir, "content", "webview"), { recursive: true });
  await copyFile(
    new URL("../runtime/webview_server.py", import.meta.url),
    join(appDir, ".chatgpt-linux", "webview_server.py"),
  );
  await writeFile(join(appDir, "content", "webview", "index.html"), "ok\n");
  await writeFile(
    join(appDir, "chatgpt-desktop"),
    '#!/usr/bin/env bash\nsleep 60 &\necho "$!" >"$CHATGPT_TEST_CHILD_PID_FILE"\n',
  );
  await chmod(join(appDir, "chatgpt-desktop"), 0o755);

  await execFileAsync("bash", [launcher.pathname], {
    env: {
      ...process.env,
      CHATGPT_APP_DIR: appDir,
      CHATGPT_APP_ID: "chatgpt-launcher-test",
      CHATGPT_CODEX_CLI_PATH: "/bin/true",
      CHATGPT_HOST_CONFIG_HOME: join(root, "host-config"),
      CHATGPT_STATE_DIR: stateDir,
      CHATGPT_TEST_CHILD_PID_FILE: childPidFile,
      CHATGPT_WEBVIEW_PORT: String(port),
      HOME: root,
    },
  });

  const childPid = Number.parseInt(await readFile(childPidFile, "utf8"), 10);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      process.kill(childPid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return;
      throw error;
    }
    await delay(25);
  }
  assert.fail(`Electron child process ${childPid} survived launcher cleanup`);
});

test("launcher stays ChatGPT-specific and compact", async () => {
  const source = await readFile(launcher, "utf8");
  assert.ok(source.split("\n").length < 200);
  assert.match(source, /terminate\(\).*?trap - EXIT.*?cleanup.*?exit 0/su);
  assert.match(source, /setsid "\$app_dir\/chatgpt-desktop"/u);
  assert.match(source, /kill -TERM -- "-\$electron_pid"/u);
  assert.match(source, /kill -KILL -- "-\$electron_pid"/u);
  assert.doesNotMatch(source, /update.manager|linux.features|bootstrap.wizard/iu);
});
