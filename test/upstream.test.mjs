import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectAppMetadata,
  parseArchiveLayout,
  parseInfoPlist,
} from "../src/upstream.mjs";

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>ChatGPT</string>
  <key>CFBundleIdentifier</key><string>com.openai.codex</string>
  <key>CFBundleShortVersionString</key><string>26.707.51957</string>
  <key>CFBundleVersion</key><string>5175</string>
</dict></plist>`;

test("parseInfoPlist reads immutable upstream identity", () => {
  assert.deepEqual(parseInfoPlist(infoPlist), {
    build: "5175",
    bundleId: "com.openai.codex",
    executable: "ChatGPT",
    version: "26.707.51957",
  });
});

test("parseArchiveLayout finds one complete ChatGPT application", () => {
  const listing = [
    "Path = /tmp/ChatGPT.dmg",
    "Path = ChatGPT Installer/ChatGPT.app/Contents/Info.plist",
    "Path = ChatGPT Installer/ChatGPT.app/Contents/Resources/app.asar",
    "Path = ChatGPT Installer/ChatGPT.app/Contents/Resources/icon-chatgpt.png",
  ].join("\n");

  assert.deepEqual(parseArchiveLayout(listing), {
    appRoot: "ChatGPT Installer/ChatGPT.app",
    asar: "ChatGPT Installer/ChatGPT.app/Contents/Resources/app.asar",
    icon: "ChatGPT Installer/ChatGPT.app/Contents/Resources/icon-chatgpt.png",
    infoPlist: "ChatGPT Installer/ChatGPT.app/Contents/Info.plist",
  });
});

test("parseArchiveLayout rejects incomplete or ambiguous archives", () => {
  assert.throws(
    () => parseArchiveLayout("Path = Other.app/Contents/Info.plist"),
    /complete ChatGPT\.app/,
  );

  const duplicate = [
    "A/ChatGPT.app/Contents/Info.plist",
    "A/ChatGPT.app/Contents/Resources/app.asar",
    "A/ChatGPT.app/Contents/Resources/icon-chatgpt.png",
    "B/ChatGPT.app/Contents/Info.plist",
    "B/ChatGPT.app/Contents/Resources/app.asar",
    "B/ChatGPT.app/Contents/Resources/icon-chatgpt.png",
  ].map((path) => `Path = ${path}`).join("\n");
  assert.throws(() => parseArchiveLayout(duplicate), /exactly one/);
});

test("inspectAppMetadata joins plist and ASAR package facts", () => {
  const packageJson = {
    dependencies: {
      "better-sqlite3": "^12.9.0",
      "node-pty": "^1.1.0",
      unrelated: "1.0.0",
    },
    devDependencies: { electron: "42.1.0" },
    main: ".vite/build/early-bootstrap.js",
    name: "openai-codex-electron",
    version: "26.707.51957",
  };

  assert.deepEqual(inspectAppMetadata(infoPlist, packageJson), {
    app: {
      build: "5175",
      bundleId: "com.openai.codex",
      executable: "ChatGPT",
      main: ".vite/build/early-bootstrap.js",
      name: "openai-codex-electron",
      version: "26.707.51957",
    },
    electron: { version: "42.1.0" },
    nativeModules: {
      "better-sqlite3": "^12.9.0",
      "node-pty": "^1.1.0",
    },
  });
});

test("inspectAppMetadata rejects conflicting app versions", () => {
  assert.throws(
    () => inspectAppMetadata(infoPlist, {
      devDependencies: { electron: "42.1.0" },
      main: "main.js",
      name: "app",
      version: "0.0.0",
    }),
    /version mismatch/,
  );
});
