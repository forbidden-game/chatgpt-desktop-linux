const MARKER = "/* chatgpt-linux: linux-chrome-extension */";

const OPEN_EXTENSION_SETTINGS =
  "async function nc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=rc,runCommand:r=Ps}){if(t===`darwin`){await r(Qs,[`-b`,Zs,ec(e)]);return}if(t===`win32`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[ec(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS and Windows`)}";
const OPEN_EXTENSION_SETTINGS_LINUX =
  "async function nc({extensionId:e,platform:t=process.platform,detectChromeCommand:n=rc,runCommand:r=Ps}){if(t===`darwin`){await r(Qs,[`-b`,Zs,ec(e)]);return}if(t===`win32`||t===`linux`){let t=n();if(t==null)throw Error(`Google Chrome is not installed`);await r(t,[ec(e)]);return}throw Error(`Opening Chrome extension settings is only supported on macOS, Windows, and Linux`)}";

const DETECT_CHROME =
  "function rc(){return As(`chrome.exe`)??As(`chrome`)??Hs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??ic()}";
const DETECT_CHROME_LINUX =
  "function rc(){return As(`chrome.exe`)??As(`chrome`)??As(`google-chrome-stable`)??As(`google-chrome`)??Hs([[`Google`,`Chrome`,`Application`,`chrome.exe`]])??ic()}";

const CHROME_PROFILE_ROOT =
  "function oc({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):null}";
const CHROME_PROFILE_ROOT_LINUX =
  "function oc({homeDir:e,localAppDataDir:t,platform:n}){return n===`darwin`?(0,u.join)(e,`Library`,`Application Support`,`Google`,`Chrome`):n===`win32`?(0,u.join)(t??(0,u.join)(e,`AppData`,`Local`),`Google`,`Chrome`,`User Data`):n===`linux`?(0,u.join)(process.env.XDG_CONFIG_HOME??(0,u.join)(e,`.config`),`google-chrome`):null}";

const REPLACEMENTS = [
  [OPEN_EXTENSION_SETTINGS, OPEN_EXTENSION_SETTINGS_LINUX],
  [DETECT_CHROME, DETECT_CHROME_LINUX],
  [CHROME_PROFILE_ROOT, CHROME_PROFILE_ROOT_LINUX],
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
  const patched = REPLACEMENTS.reduce(
    (current, [original, replacement]) => replaceExactlyOnce(current, original, replacement),
    source,
  );
  return `${MARKER}${patched}`;
}
