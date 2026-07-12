const MARKER = "/* chatgpt-linux: linux-chrome-extension */";

const UPSTREAM_VARIANTS = [
  [
    [
      "async function nc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=rc,runCommand:r=Ps}){if(t===`darwin`){await r(Qs,[`-b`,Zs,ec(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[ec(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}",
      "async function nc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=rc,runCommand:r=Ps}){if(t===`darwin`){await r(Qs,[`-b`,Zs,ec(e)]);return}if(t===`win32`||t===`linux`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[ec(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)}",
    ],
    [
      "function rc(){return As(`chrome.exe`)??As(`chrome`)??Hs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??ic()}",
      "function rc(){return As(`chrome.exe`)??As(`chrome`)??As(`google-chrome-stable`)??As(`google-chrome`)??Hs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??ic()}",
    ],
    [
      "function oc({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
      "function oc({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):n===`linux`?(0,u.join)(process.env.XDG_CONFIG_HOME??(0,u.join)(e,`.config`),`google-chrome`):null}",
    ],
  ],
  [
    [
      "async function tc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=nc,runCommand:r=Ns}){if(t===`darwin`){await r(Zs,[`-b`,Xs,$s(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[$s(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}",
      "async function tc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=nc,runCommand:r=Ns}){if(t===`darwin`){await r(Zs,[`-b`,Xs,$s(e)]);return}if(t===`win32`||t===`linux`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[$s(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)}",
    ],
    [
      "function nc(){return ks(`chrome.exe`)??ks(`chrome`)??Vs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??rc()}",
      "function nc(){return ks(`chrome.exe`)??ks(`chrome`)??ks(`google-chrome-stable`)??ks(`google-chrome`)??Vs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??rc()}",
    ],
    [
      "function ac({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}",
      "function ac({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):n===`linux`?(0,u.join)(process.env.XDG_CONFIG_HOME??(0,u.join)(e,`.config`),`google-chrome`):null}",
    ],
  ],
];

function replaceExactlyOnce(source, original, replacement) {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error("unsupported Chrome extension source");
  }
  return source.replace(original, replacement);
}

export function applyLinuxChromeExtensionPatch(source) {
  if (source.includes(MARKER)) return source;
  const replacements = UPSTREAM_VARIANTS.find((variant) =>
    variant.every(([original]) => source.includes(original))
  );
  if (replacements == null) throw new Error("unsupported Chrome extension source");
  const patched = replacements.reduce(
    (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
    source,
  );
  return `${MARKER}${patched}`;
}
