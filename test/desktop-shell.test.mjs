import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLinuxDesktopIdentityPatch,
  applyLinuxDesktopShellPatch,
  selectBootstrapBundle,
  selectMainBundle,
} from "../src/patches/desktop-shell.mjs";

const fixture = [
  "function x_(e,t){switch(t){case n.Vc.ChatGPT:return{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}}}",
  "function j9(e=1){return{color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Ane:kne,height:Math.round(One*e)}}",
  "if(process.platform===`win32`&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){",
  "async function ore(e){return process.platform!==`win32`&&process.platform!==`darwin`?null:(W9=!0,e)}",
  "};j&&we();let Ee=er(",
].join(";");

const bootstrapFixture =
  "a.app.setName(t.Na(Z,Q)),a.app.setPath(`userData`,ee({appDataPath:a.app.getPath(`appData`)}))";

test("Linux desktop shell reuses upstream tray and renders an opaque title overlay", () => {
  const patched = applyLinuxDesktopShellPatch(fixture);

  assert.match(patched, /process\.platform!==`linux`\?null/);
  assert.match(patched, /\(j\|\|process\.platform===`linux`\)&&we\(\)/);
  assert.match(patched, /process\.platform===`win32`\|\|process\.platform===`linux`/);
  assert.match(patched, /icon-chatgpt\.png/);
  assert.match(
    patched,
    /color:process\.platform===`linux`\?\(c\.nativeTheme\.shouldUseDarkColors\?`#1f1f1f`:`#f9f9f9`\):k9/,
  );
});

test("Linux desktop shell patch is exact and idempotent", () => {
  const patched = applyLinuxDesktopShellPatch(fixture);
  assert.equal(applyLinuxDesktopShellPatch(patched), patched);
  assert.throws(
    () => applyLinuxDesktopShellPatch("upstream drift"),
    /unsupported desktop shell source/,
  );
});

test("main bundle selection fails closed", () => {
  assert.equal(selectMainBundle(["worker.js", "main-abc.js"]), "main-abc.js");
  assert.throws(() => selectMainBundle(["worker.js"]), /exactly one main bundle/);
  assert.throws(
    () => selectMainBundle(["main-a.js", "main-b.js"]),
    /exactly one main bundle/,
  );
});

test("Linux bootstrap declares the packaged desktop identity", () => {
  const patched = applyLinuxDesktopIdentityPatch(bootstrapFixture);
  assert.match(
    patched,
    /process\.platform===`linux`&&a\.app\.setDesktopName\(`chatgpt-desktop\.desktop`\)/,
  );
  assert.equal(applyLinuxDesktopIdentityPatch(patched), patched);
  assert.throws(
    () => applyLinuxDesktopIdentityPatch("upstream drift"),
    /unsupported desktop identity source/,
  );
});

test("bootstrap bundle selection fails closed", () => {
  assert.equal(
    selectBootstrapBundle(["bootstrap-abc.js", "main-def.js"]),
    "bootstrap-abc.js",
  );
  assert.throws(() => selectBootstrapBundle(["main-def.js"]), /exactly one bootstrap bundle/);
});
