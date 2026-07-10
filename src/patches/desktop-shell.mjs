const MARKER = "/* chatgpt-linux: linux-desktop-shell */";
const IDENTITY_MARKER = "/* chatgpt-linux: linux-desktop-identity */";
const APP_NAME_SETUP = "a.app.setName(t.Na(Z,Q)),a.app.setPath(";
const LINUX_APP_NAME_SETUP =
  "a.app.setName(t.Na(Z,Q)),process.platform===`linux`&&a.app.setDesktopName(`chatgpt-desktop.desktop`),a.app.setPath(";

const REPLACEMENTS = [
  [
    "case n.Vc.ChatGPT:return{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
    "case n.Vc.ChatGPT:return process.platform===`linux`?{dark:`icon-chatgpt.png`,light:`icon-chatgpt.png`}:{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
  ],
  [
    "color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?One:Dne",
    "color:process.platform===`linux`?(c.nativeTheme.shouldUseDarkColors?`#1f1f1f`:`#f9f9f9`):k9,symbolColor:c.nativeTheme.shouldUseDarkColors?One:Dne",
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
    "function v6(e){let t=c.Menu.buildFromTemplate([{role:`quit`}]);",
    "function v6(e){let t=(process.platform===`linux`?require(`electron`).Menu:c.Menu).buildFromTemplate([{role:`quit`}]);",
  ],
  [
    "};j&&we();let Ee=er(",
    "};(j||process.platform===`linux`)&&we();let Ee=er(",
  ],
];

function replaceExactlyOnce(source, original, replacement) {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error("unsupported desktop shell source");
  }
  return source.replace(original, replacement);
}

export function applyLinuxDesktopShellPatch(source) {
  if (source.includes(MARKER)) return source;
  const patched = REPLACEMENTS.reduce(
    (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
    source,
  );
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
