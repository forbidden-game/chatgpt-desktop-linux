const MARKER = "/* chatgpt-linux: linux-desktop-shell */";
const IDENTITY_MARKER = "/* chatgpt-linux: linux-desktop-identity */";
const APP_NAME_SETUP_VARIANTS = [
  "a.app.setName(t.Na(Z,Q)),a.app.setPath(",
  "a.app.setName(t.Ka(Z,Q)),a.app.setPath(",
  "a.app.setName(t.qa(Z,Q)),a.app.setPath(",
];
const LINUX_TRAY_ICON_SIZE = 64;
const LINUX_QUIT_GRACE_MS = 10_000;

const NATIVE_LINUX_TRAY_ICON_VARIANTS = [
  "case n.nl.ChatGPT:return[`chatgptTemplate.png`,`chatgptTemplate@2x.png`]",
  "case n.rl.ChatGPT:return[`chatgptTemplate.png`,`chatgptTemplate@2x.png`]",
];

const NATIVE_LINUX_TRAY_SUPPORT = [
  "process.platform===`linux`){this.tray.on(`click`,()=>{this.onOpenMainWindow()}),this.updatePersistentTrayMenu();return}",
  "updatePersistentTrayMenu(){process.platform===`linux`&&this.tray.setContextMenu(c.Menu.buildFromTemplate(this.getNativeTrayMenuItems()))}",
  "if((process.platform===`win32`||process.platform===`linux`)&&!this.isAppQuitting&&this.options.canHideLastWindowToTray?.()===!0&&!t){",
  "function _8(e){let{width:t,height:n}=e.getSize();return!t||!n||t<=g8&&n<=g8?e:e.resize({width:g8,height:g8,quality:`best`})}",
];

const NATIVE_LINUX_REPLACEMENTS = [
  [
    "async function gj(e){let t=e;if(typeof t.whenReady!=`function`)return process.platform!==`linux`;try{return await t.whenReady(),!0}catch{return!1}}",
    "async function gj(e){let t=e;if(typeof t.whenReady!=`function`)return!0;try{return await t.whenReady(),!0}catch{return!1}}",
  ],
  [
    "function _j(e){let t=e;return typeof t.isReady==`function`?t.isReady():process.platform!==`linux`}",
    "function _j(e){let t=e;return typeof t.isReady==`function`?t.isReady():!0}",
  ],
  [
    "color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Pie:Nie",
    "color:process.platform===`linux`?(c.nativeTheme.shouldUseDarkColors?`#1f1f1f`:`#f9f9f9`):k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Pie:Nie",
  ],
  [
    "{label:A8(this.appName),click:()=>{c.app.quit()}}]}updateChronicleTrayIcon",
    `{label:A8(this.appName),click:()=>{process.platform===\`linux\`&&!c.app.__linuxTrayQuitFallback&&(c.app.__linuxTrayQuitFallback=!0,c.app.once(\`will-quit\`,()=>{let e=setTimeout(()=>{c.app.exit(0)},${LINUX_QUIT_GRACE_MS});e.unref?.()})),c.app.quit()}}]}updateChronicleTrayIcon`,
  ],
];

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
  if (
    NATIVE_LINUX_TRAY_ICON_VARIANTS.some((snippet) => source.includes(snippet)) &&
    NATIVE_LINUX_TRAY_SUPPORT.every((snippet) => source.includes(snippet))
  ) {
    const patched = NATIVE_LINUX_REPLACEMENTS.reduce(
      (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
      source,
    );
    return `${MARKER}${patched}`;
  }
  const commonPatched = REPLACEMENTS.reduce(
    (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
    source,
  );
  const patched = REPLACEMENT_VARIANTS.reduce(replaceExactlyOneVariant, commonPatched);
  return `${MARKER}${patched}`;
}

export function applyLinuxDesktopIdentityPatch(source) {
  if (source.includes(IDENTITY_MARKER)) return source;
  const matches = APP_NAME_SETUP_VARIANTS.filter((variant) => source.includes(variant));
  if (matches.length !== 1) {
    throw new Error("unsupported desktop identity source");
  }
  const appNameSetup = matches[0];
  const linuxAppNameSetup = appNameSetup.replace(
    ",a.app.setPath(",
    ",process.platform===`linux`&&a.app.setDesktopName(`chatgpt-desktop.desktop`),a.app.setPath(",
  );
  return `${IDENTITY_MARKER}${source.replace(appNameSetup, linuxAppNameSetup)}`;
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
