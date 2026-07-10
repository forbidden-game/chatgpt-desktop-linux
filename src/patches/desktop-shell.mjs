const MARKER = "/* chatgpt-linux: linux-desktop-shell */";

const REPLACEMENTS = [
  [
    "case n.Vc.ChatGPT:return{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
    "case n.Vc.ChatGPT:return process.platform===`linux`?{dark:`icon-chatgpt.png`,light:`icon-chatgpt.png`}:{dark:`chatgpt-tray-dark.ico`,light:`chatgpt-tray-light.ico`}",
  ],
  [
    "color:k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Ane:kne",
    "color:process.platform===`linux`?(c.nativeTheme.shouldUseDarkColors?`#1f1f1f`:`#f9f9f9`):k9,symbolColor:c.nativeTheme.shouldUseDarkColors?Ane:kne",
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

export function selectMainBundle(names) {
  const matches = names.filter((name) => /^main-[A-Za-z0-9_-]+\.js$/u.test(name));
  if (matches.length !== 1) {
    throw new Error(`expected exactly one main bundle, found ${matches.length}`);
  }
  return matches[0];
}
