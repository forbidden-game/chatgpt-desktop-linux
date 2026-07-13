const MARKER = "/* chatgpt-linux: linux-desktop-shell */";
const IDENTITY_MARKER = "/* chatgpt-linux: linux-desktop-identity */";
const APP_NAME_SETUP = "a.app.setName(t.Na(Z,Q)),a.app.setPath(";
const LINUX_APP_NAME_SETUP =
  "a.app.setName(t.Na(Z,Q)),process.platform===`linux`&&a.app.setDesktopName(`chatgpt-desktop.desktop`),a.app.setPath(";
const LINUX_TRAY_ICON_SIZE = 64;
const LINUX_QUIT_GRACE_MS = 10_000;

const REPLACEMENTS = [
  [
    "case n.Vc.ChatGPT:return{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
    "case n.Vc.ChatGPT:return process.platform===`linux`?{dark:`chatgptTemplate.png`,light:`chatgptTemplate.png`}:{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
  ],
  [
    "if(process.platform===`win32`&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){",
    "if((process.platform===`win32`||process.platform===`linux`)&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){",
  ],
  [
    "process.platform!==`win32`&&process.platform!==`darwin`?null:",
    "process.platform!==`win32`&&process.platform!==`darwin`&&process.platform!==`linux`?null:",
  ],
  [
    "this.tray.on(`click`,()=>{this.onTrayButtonClick()}),this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})",
    "this.tray.on(`click`,()=>{this.onTrayButtonClick()}),process.platform===`linux`?this.tray.setContextMenu(require(`electron`).Menu.buildFromTemplate(this.getNativeTrayMenuItems())):this.tray.on(`right-click`,()=>{this.openNativeTrayMenu()})",
  ],
  [
    "this.trayMenuThreads=e.trayMenuThreads;return",
    "this.trayMenuThreads=e.trayMenuThreads,process.platform===`linux`&&this.tray.setContextMenu(require(`electron`).Menu.buildFromTemplate(this.getNativeTrayMenuItems()));return",
  ],
  [
    "};j&&we();let Ee=er(",
    "};(j||process.platform===`linux`)&&we();let Ee=er(",
  ],
  [
    "for(let e of a){let t=c.nativeImage.createFromPath(e);if(!t.isEmpty())return t}return null}function q9",
    `for(let e of a){let t=c.nativeImage.createFromPath(e);if(!t.isEmpty()){let e=t.getSize();return process.platform===\`linux\`&&(e.width>${LINUX_TRAY_ICON_SIZE}||e.height>${LINUX_TRAY_ICON_SIZE})?t.resize({width:${LINUX_TRAY_ICON_SIZE},height:${LINUX_TRAY_ICON_SIZE},quality:\`best\`}):t}}return null}function q9`,
  ],
  [
    "{label:b6(this.appName),click:()=>{c.app.quit()}}]}updateChronicleTrayIcon",
    `{label:b6(this.appName),click:()=>{process.platform===\`linux\`&&!c.app.__linuxTrayQuitFallback&&(c.app.__linuxTrayQuitFallback=!0,c.app.once(\`will-quit\`,()=>{let e=setTimeout(()=>{c.app.exit(0)},${LINUX_QUIT_GRACE_MS});e.unref?.()})),c.app.quit()}}]}updateChronicleTrayIcon`,
  ],
];

const REPLACEMENT_VARIANTS = [
  [
    [
      "color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?One:Dne",
      "color:process.platform===`linux`?(c.nativeTheme.shouldUseDarkColors?`#1f1f1f`:`#f9f9f9`):k9,symbolColor:c.nativeTheme.shouldUseDarkColors?One:Dne",
    ],
    [
      "color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Ane:kne",
      "color:process.platform===`linux`?(c.nativeTheme.shouldUseDarkColors?`#1f1f1f`:`#f9f9f9`):k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Ane:kne",
    ],
  ],
  [
    [
      "function v6(e){let t=c.Menu.buildFromTemplate([{role:`quit`}]);",
      "function v6(e){let t=(process.platform===`linux`?require(`electron`).Menu:c.Menu).buildFromTemplate([{role:`quit`}]);",
    ],
    [
      "function b6(e){let t=c.Menu.buildFromTemplate([{role:`quit`}]);",
      "function b6(e){let t=(process.platform===`linux`?require(`electron`).Menu:c.Menu).buildFromTemplate([{role:`quit`}]);",
    ],
  ],
];

function replaceExactlyOnce(source, original, replacement) {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error("unsupported desktop shell source");
  }
  return source.replace(original, replacement);
}

function replaceExactlyOneVariant(source, variants) {
  const matching = variants.filter(([original]) => source.includes(original));
  if (matching.length !== 1) throw new Error("unsupported desktop shell source");
  return replaceExactlyOnce(source, ...matching[0]);
}

export function applyLinuxDesktopShellPatch(source) {
  if (source.includes(MARKER)) return source;
  const commonPatched = REPLACEMENTS.reduce(
    (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
    source,
  );
  const patched = REPLACEMENT_VARIANTS.reduce(replaceExactlyOneVariant, commonPatched);
  return `${MARKER}${patched}`;
}

export function applyLinuxDesktopIdentityPatch(source) {
  if (source.includes(IDENTITY_MARKER)) return source;
  if (!source.includes(APP_NAME_SETUP)) {
    throw new Error("unsupported desktop identity source");
  }
  return `${IDENTITY_MARKER}${source.replace(APP_NAME_SETUP, LINUX_APP_NAME_SETUP)}`;
}

function selectBundle(names, prefix) {
  const matches = names.filter((name) => new RegExp(`^${prefix}-[A-Za-z0-9_-]+\\.js$`, "u").test(name));
  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${prefix} bundle, found ${matches.length}`);
  }
  return matches[0];
}

export function selectMainBundle(names) {
  return selectBundle(names, "main");
}

export function selectBootstrapBundle(names) {
  return selectBundle(names, "bootstrap");
}
