import assert from "node:assert/strict";
import test from "node:test";

import {
  electronArtifactName,
  expectedElectronSha256,
} from "../src/electron-runtime.mjs";
import {
  nativeBuildManifest,
  nativeRuntimeFiles,
  pluginCompatibilityPlan,
  selectedResourceMembers,
} from "../src/assemble.mjs";

test("electronArtifactName maps the supported v1 target", () => {
  assert.equal(
    electronArtifactName("42.1.0", "x64"),
    "electron-v42.1.0-linux-x64.zip",
  );
  assert.throws(() => electronArtifactName("42.1.0", "arm64"), /x64/);
});

test("expectedElectronSha256 requires an exact release entry", () => {
  const shasums = [
    "aaaa  electron-v42.1.0-darwin-arm64.zip",
    "882047343a9e203c6cfc5d39b166ea9e025dd256943e0d3711f86725ad0e3bd9 *electron-v42.1.0-linux-x64.zip",
  ].join("\n");
  assert.equal(
    expectedElectronSha256(shasums, "electron-v42.1.0-linux-x64.zip"),
    "882047343a9e203c6cfc5d39b166ea9e025dd256943e0d3711f86725ad0e3bd9",
  );
  assert.throws(
    () => expectedElectronSha256(shasums, "electron-v42.1.0-linux-arm64.zip"),
    /missing/,
  );
});

test("selectedResourceMembers keeps upstream product resources but not macOS runtimes", () => {
  const members = selectedResourceMembers("ChatGPT Installer/ChatGPT.app");
  assert.deepEqual(members, [
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/app.asar",
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/app.asar.unpacked/*",
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/plugins/*",
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/skills/*",
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/icon-chatgpt.png",
    "ChatGPT Installer/ChatGPT.app/Contents/Resources/codex-notification.wav",
  ]);
  assert.ok(!members.some((member) => member.endsWith("/codex")));
  assert.ok(!members.some((member) => member.includes("cua_node")));
});

test("nativeBuildManifest pins the versions found inside the ASAR", () => {
  assert.deepEqual(nativeBuildManifest({
    "better-sqlite3": "12.9.0",
    "node-pty": "1.1.0",
  }), {
    dependencies: {
      "better-sqlite3": "12.9.0",
      "node-pty": "1.1.0",
    },
    private: true,
  });
  assert.throws(
    () => nativeBuildManifest({ "better-sqlite3": "^12.9.0", "node-pty": "1.1.0" }),
    /exact native module version/,
  );
});

test("nativeRuntimeFiles follows the Linux loaders, not macOS spawn helpers", () => {
  assert.deepEqual(nativeRuntimeFiles(), [
    "better-sqlite3/build/Release/better_sqlite3.node",
    "node-pty/build/Release/pty.node",
  ]);
});

test("plugin compatibility plan removes only proven macOS payloads", () => {
  assert.deepEqual(pluginCompatibilityPlan(), {
    removedFiles: [
      "chrome/extension-host/macos",
      "latex/bin/tectonic",
    ],
    removedPlugins: ["computer-use", "record-and-replay"],
  });
});
