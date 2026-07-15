import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  applyX11WindowSuspensionPatch,
  x11WindowSuspensionRuntimeSource,
} from "../src/patches/x11-window-suspension.mjs";

const mainFixture = "async function start(){}exports.runMainAppStartup=start;";

function createWindow(bounds, options = {}) {
  const listeners = new Map();
  return {
    bounds,
    destroyed: false,
    focused: options.focused ?? false,
    maximized: options.maximized ?? true,
    minimizable: options.minimizable ?? true,
    minimized: options.minimized ?? false,
    parent: options.parent ?? null,
    getBounds() {
      return this.bounds;
    },
    getParentWindow() {
      return this.parent;
    },
    isDestroyed() {
      return this.destroyed;
    },
    isFocused() {
      return this.focused;
    },
    isMaximized() {
      return this.maximized;
    },
    isMinimizable() {
      return this.minimizable;
    },
    isMinimized() {
      return this.minimized;
    },
    minimize() {
      this.minimized = true;
    },
    on(event, listener) {
      listeners.set(event, listener);
    },
    emit(event) {
      listeners.get(event)?.();
    },
  };
}

function runRuntime({
  argv = ["chatgpt-desktop", "--ozone-platform=x11"],
  env = {},
  platform = "linux",
  windows = [],
} = {}) {
  const listeners = new Map();
  const app = {
    on: (event, listener) => listeners.set(event, listener),
  };
  let required = false;

  vm.runInNewContext(x11WindowSuspensionRuntimeSource(), {
    process: {
      argv,
      env,
      platform,
    },
    require(specifier) {
      required = true;
      assert.equal(specifier, "electron");
      return {
        app,
        BrowserWindow: { getAllWindows: () => windows },
      };
    },
    setImmediate: (listener) => listener(),
  });

  return { app, listeners, required };
}

test("X11 window suspension patch is exact and idempotent", () => {
  const patched = applyX11WindowSuspensionPatch(mainFixture);

  assert.match(patched, /CHATGPT_X11_WINDOW_SUSPENSION/u);
  assert.equal(applyX11WindowSuspensionPatch(patched), patched);
  assert.throws(
    () => applyX11WindowSuspensionPatch("upstream drift"),
    /unsupported main process source for X11 window suspension/u,
  );
  assert.throws(
    () => applyX11WindowSuspensionPatch(`${mainFixture}${mainFixture}`),
    /unsupported main process source for X11 window suspension/u,
  );
});

test("focusing a fully overlapping maximized X11 window minimizes the covered one", () => {
  const covered = createWindow({ x: 0, y: 54, width: 3072, height: 1866 });
  const focused = createWindow(
    { x: 0, y: 54, width: 3072, height: 1866 },
    { focused: true },
  );
  const { listeners } = runRuntime({ windows: [covered, focused] });

  listeners.get("browser-window-focus")(null, focused);

  assert.equal(covered.minimized, true);
  assert.equal(focused.minimized, false);
});

test("X11 window suspension preserves side-by-side and child windows", () => {
  const focused = createWindow(
    { x: 0, y: 0, width: 1536, height: 1800 },
    { focused: true },
  );
  const sideBySide = createWindow({ x: 1536, y: 0, width: 1536, height: 1800 });
  const child = createWindow(
    { x: 0, y: 0, width: 1536, height: 1800 },
    { parent: focused },
  );
  const { listeners } = runRuntime({ windows: [focused, sideBySide, child] });

  listeners.get("browser-window-focus")(null, focused);

  assert.equal(sideBySide.minimized, false);
  assert.equal(child.minimized, false);
});

test("maximizing the focused window also suspends an already covered window", () => {
  const covered = createWindow({ x: 0, y: 0, width: 1920, height: 1080 });
  const focused = createWindow(
    { x: 0, y: 0, width: 1920, height: 1080 },
    { focused: true },
  );
  const { listeners } = runRuntime({ windows: [covered, focused] });

  listeners.get("browser-window-created")(null, focused);
  focused.emit("maximize");

  assert.equal(covered.minimized, true);
});

test("X11 window suspension can be disabled without loading Electron", () => {
  const { required } = runRuntime({
    env: { CHATGPT_X11_WINDOW_SUSPENSION: "0" },
  });

  assert.equal(required, false);
});

test("Wayland does not load the X11 window suspension runtime", () => {
  const { required } = runRuntime({
    argv: ["chatgpt-desktop", "--ozone-platform=wayland"],
    env: { XDG_SESSION_TYPE: "wayland" },
  });

  assert.equal(required, false);
});
