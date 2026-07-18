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
  "function j9(e=1){return{color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?One:Dne,height:Math.round(Ene*e)}}",
  "if(process.platform===`win32`&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){",
  "async function ore(e){return process.platform!==`win32`&&process.platform!==`darwin`?null:(W9=!0,e)}",
  "this.tray.on(`click`,()=>{this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})",
  "async handleMessage(e){switch(e.type){case`tray-menu-threads-changed`:this.trayMenuThreads=e.trayMenuThreads;return}}",
  "function v6(e){let t=c.Menu.buildFromTemplate([{role:`quit`}]);return(Array.isArray(t)?t:t.items)[0]?.label??`Quit ${e}`}",
  "};j&&we();let Ee=er(",
  "for(let e of a){let t=c.nativeImage.createFromPath(e);if(!t.isEmpty())return t}return null}function q9(e){return e}",
  "return[{label:b6(this.appName),click:()=>{c.app.quit()}}]}updateChronicleTrayIcon(e){return e}",
].join(";");

const bootstrapFixture =
  "a.app.setName(t.Na(Z,Q)),a.app.setPath(`userData`,ee({appDataPath:a.app.getPath(`appData`)}))";
const currentBootstrapFixture =
  "a.app.setName(t.Ka(Z,Q)),a.app.setPath(`userData`,ee({appDataPath:a.app.getPath(`appData`),buildFlavor:Z,env:process.env}))";
const latestBootstrapFixture =
  "a.app.setName(t.qa(Z,Q)),a.app.setPath(`userData`,ee({appDataPath:a.app.getPath(`appData`),buildFlavor:Z,env:process.env}))";

const nativeLinuxTrayFixture = [
  "async function gj(e){let t=e;if(typeof t.whenReady!=`function`)return process.platform!==`linux`;try{return await t.whenReady(),!0}catch{return!1}}",
  "function _j(e){let t=e;return typeof t.isReady==`function`?t.isReady():process.platform!==`linux`}",
  "function dv(e){switch(e){case n.nl.ChatGPT:return[`chatgptTemplate.png`,`chatgptTemplate@2x.png`]}}",
  "constructor(){if(this.appName=c,process.platform===`linux`){this.tray.on(`click`,()=>{this.onOpenMainWindow()}),this.updatePersistentTrayMenu();return}}",
  "updatePersistentTrayMenu(){process.platform===`linux`&&this.tray.setContextMenu(c.Menu.buildFromTemplate(this.getNativeTrayMenuItems()))}",
  "if((process.platform===`win32`||process.platform===`linux`)&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){e.preventDefault()}",
  "function _8(e){let{width:t,height:n}=e.getSize();return!t||!n||t<=g8&&n<=g8?e:e.resize({width:g8,height:g8,quality:`best`})}",
  "function j9(e=1){return{color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Pie:Nie,height:Math.round(Mie*e)}}",
  "return[{label:A8(this.appName),click:()=>{c.app.quit()}}]}updateChronicleTrayIcon(e){return e}",
].join(";");

const currentNativeLinuxTrayFixture = nativeLinuxTrayFixture.replace(
  "case n.nl.ChatGPT:",
  "case n.rl.ChatGPT:",
);

test("Linux desktop shell reuses upstream tray and renders an opaque title overlay", () => {
  const patched = applyLinuxDesktopShellPatch(fixture);

  assert.match(patched, /process\.platform!==`linux`\?null/);
  assert.match(patched, /\(j\|\|process\.platform===`linux`\)&&we\(\)/);
  assert.match(patched, /process\.platform===`win32`\|\|process\.platform===`linux`/);
  assert.match(patched, /chatgptTemplate\.png/);
  assert.match(
    patched,
    /color:process\.platform===`linux`\?\(c\.nativeTheme\.shouldUseDarkColors\?`#1f1f1f`:`#f9f9f9`\):k9/,
  );
  assert.match(
    patched,
    /process\.platform===`linux`\?this\.tray\.setContextMenu\(require\(`electron`\)\.Menu\.buildFromTemplate\(this\.getNativeTrayMenuItems\(\)\)\)/,
  );
  assert.match(
    patched,
    /this\.trayMenuThreads=e\.trayMenuThreads,process\.platform===`linux`&&this\.tray\.setContextMenu/,
  );
  assert.match(
    patched,
    /process\.platform===`linux`\?require\(`electron`\)\.Menu:c\.Menu/,
  );
  assert.match(
    patched,
    /process\.platform===`linux`&&\(e\.width>64\|\|e\.height>64\)\?t\.resize\(\{width:64,height:64,quality:`best`\}\):t/,
  );
  assert.match(
    patched,
    /process\.platform===`linux`&&!c\.app\.__linuxTrayQuitFallback&&\(c\.app\.__linuxTrayQuitFallback=!0,c\.app\.once\(`will-quit`,\(\)=>\{let e=setTimeout\(\(\)=>\{c\.app\.exit\(0\)\},10000\);e\.unref\?\.\(\)\}\)\),c\.app\.quit\(\)/,
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

test("Linux desktop shell preserves native tray support and remaining safeguards", () => {
  const patched = applyLinuxDesktopShellPatch(nativeLinuxTrayFixture);

  assert.match(patched, /chatgptTemplate@2x\.png/u);
  assert.match(patched, /updatePersistentTrayMenu\(\)/u);
  assert.match(
    patched,
    /color:process\.platform===`linux`\?\(c\.nativeTheme\.shouldUseDarkColors\?`#1f1f1f`:`#f9f9f9`\):k9/u,
  );
  assert.match(patched, /__linuxTrayQuitFallback/u);
  assert.match(patched, /typeof t\.whenReady!=`function`\)return!0/u);
  assert.match(patched, /typeof t\.isReady==`function`\?t\.isReady\(\):!0/u);
  assert.equal(applyLinuxDesktopShellPatch(patched), patched);
});

test("Linux desktop shell accepts the current native tray symbol variant", () => {
  const patched = applyLinuxDesktopShellPatch(currentNativeLinuxTrayFixture);

  assert.match(patched, /case n\.rl\.ChatGPT/u);
  assert.match(patched, /__linuxTrayQuitFallback/u);
  assert.equal(applyLinuxDesktopShellPatch(patched), patched);
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

test("Linux bootstrap accepts the current upstream symbol variant", () => {
  const patched = applyLinuxDesktopIdentityPatch(currentBootstrapFixture);

  assert.match(
    patched,
    /a\.app\.setName\(t\.Ka\(Z,Q\)\),process\.platform===`linux`&&a\.app\.setDesktopName\(`chatgpt-desktop\.desktop`\)/u,
  );
});

test("Linux bootstrap accepts the latest upstream symbol variant", () => {
  const patched = applyLinuxDesktopIdentityPatch(latestBootstrapFixture);

  assert.match(
    patched,
    /a\.app\.setName\(t\.qa\(Z,Q\)\),process\.platform===`linux`&&a\.app\.setDesktopName\(`chatgpt-desktop\.desktop`\)/u,
  );
});

test("bootstrap bundle selection fails closed", () => {
  assert.equal(
    selectBootstrapBundle(["bootstrap-abc.js", "main-def.js"]),
    "bootstrap-abc.js",
  );
  assert.throws(() => selectBootstrapBundle(["main-def.js"]), /exactly one bootstrap bundle/);
});
