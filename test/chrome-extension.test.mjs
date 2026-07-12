import assert from "node:assert/strict";
import test from "node:test";

import { applyLinuxChromeExtensionPatch } from "../src/patches/chrome-extension.mjs";

const fixture = [
  "async function nc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=rc,runCommand:r=Ps}){if(t===`darwin`){await r(Qs,[`-b`,Zs,ec(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[ec(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}",
  "function rc(){return As(`chrome.exe`)??As(`chrome`)??Hs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??ic()}",
  "function oc({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
].join(";");

const currentUpstreamFixture = [
  "async function tc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=nc,runCommand:r=Ns}){if(t===`darwin`){await r(Zs,[`-b`,Xs,$s(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[$s(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}",
  "function nc(){return ks(`chrome.exe`)??ks(`chrome`)??Vs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??rc()}",
  "function ac({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
].join(";");

test("Linux Chrome extension patch uses the real profile and Chrome executable", () => {
  const patched = applyLinuxChromeExtensionPatch(fixture);

  assert.match(patched, /t===`win32`\|\|t===`linux`/u);
  assert.match(patched, /As\(`google-chrome-stable`\)\?\?As\(`google-chrome`\)/u);
  assert.match(patched, /process\.env\.XDG_CONFIG_HOME.*?`google-chrome`/u);
});

test("Linux Chrome extension patch is exact and idempotent", () => {
  const patched = applyLinuxChromeExtensionPatch(fixture);
  assert.equal(applyLinuxChromeExtensionPatch(patched), patched);
  assert.throws(
    () => applyLinuxChromeExtensionPatch("upstream drift"),
    /unsupported Chrome extension source/u,
  );
});

test("Linux Chrome extension patch accepts the current upstream bundle", () => {
  const patched = applyLinuxChromeExtensionPatch(currentUpstreamFixture);

  assert.match(patched, /t===`win32`\|\|t===`linux`/u);
  assert.match(patched, /ks\(`google-chrome-stable`\)\?\?ks\(`google-chrome`\)/u);
  assert.match(patched, /process\.env\.XDG_CONFIG_HOME.*?`google-chrome`/u);
});
