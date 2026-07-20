const MARKER = "/* chatgpt-linux: linux-chrome-extension */";

const NATIVE_LINUX_VARIANTS = [
  [
    "if(t===`win32`||t===`linux`){let i=(n??(t===`linux`?()=>nc(e):tc))();if(i==null)throw Error(t===`linux`?`Google Chrome or Chromium is not installed`:`Google Chrome is not installed`);await r(i,[Qs(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)",
    "function nc(e){let t=e.trim(),r=!1;for(let e of n.Fn){if(!oc((0,d.join)(n.In({chromeConfigHome:process.env.CHROME_CONFIG_HOME,homeDir:(0,u.homedir)(),xdgConfigHome:process.env.XDG_CONFIG_HOME}),e.userDataDirName),t))continue;r=!0;let i=rc(e);if(i!=null)return i}if(r)return null;for(let e of n.Fn){let t=rc(e);if(t!=null)return t}return null}",
    "if(i===`linux`){let r=n.In({chromeConfigHome:e,homeDir:t,xdgConfigHome:a});return n.Fn.map(e=>(0,d.join)(r,e.userDataDirName))}",
  ],
  [
    "if(t===`win32`||t===`linux`){let i=(n??(t===`linux`?()=>nc(e):tc))();if(i==null)throw Error(t===`linux`?`Google Chrome or Chromium is not installed`:`Google Chrome is not installed`);await r(i,[Qs(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)",
    "function nc(e){let t=e.trim(),r=!1;for(let e of n.In){if(!oc((0,d.join)(n.Ln({chromeConfigHome:process.env.CHROME_CONFIG_HOME,homeDir:(0,u.homedir)(),xdgConfigHome:process.env.XDG_CONFIG_HOME}),e.userDataDirName),t))continue;r=!0;let i=rc(e);if(i!=null)return i}if(r)return null;for(let e of n.In){let t=rc(e);if(t!=null)return t}return null}",
    "if(i===`linux`){let r=n.Ln({chromeConfigHome:e,homeDir:t,xdgConfigHome:a});return n.In.map(e=>(0,d.join)(r,e.userDataDirName))}",
  ],
  [
    "if(t===`win32`||t===`linux`){let i=(n??(t===`linux`?()=>tc(e):ec))();if(i==null)throw Error(t===`linux`?`Google Chrome or Chromium is not installed`:`Google Chrome is not installed`);await r(i,[Zs(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)",
    "function tc(e){let t=e.trim(),r=!1;for(let e of n.In){if(!ac((0,f.join)(n.Ln({chromeConfigHome:process.env.CHROME_CONFIG_HOME,homeDir:(0,d.homedir)(),xdgConfigHome:process.env.XDG_CONFIG_HOME}),e.userDataDirName),t))continue;r=!0;let i=nc(e);if(i!=null)return i}if(r)return null;for(let e of n.In){let t=nc(e);if(t!=null)return t}return null}",
    "if(i===`linux`){let r=n.Ln({chromeConfigHome:e,homeDir:t,xdgConfigHome:a});return n.In.map(e=>(0,f.join)(r,e.userDataDirName))}",
  ],
];

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
  if (
    NATIVE_LINUX_VARIANTS.some((variant) =>
      variant.every((snippet) => source.includes(snippet))
    )
  ) {
    return source;
  }
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
