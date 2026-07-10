import { extractFile } from "@electron/asar";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  access,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const REQUIRED_PLIST_KEYS = {
  build: "CFBundleVersion",
  bundleId: "CFBundleIdentifier",
  executable: "CFBundleExecutable",
  version: "CFBundleShortVersionString",
};

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function parseInfoPlist(source) {
  const values = new Map();
  const pattern = /<key>([^<]+)<\/key>\s*<(string|integer)>([\s\S]*?)<\/\2>/gu;
  for (const match of source.matchAll(pattern)) {
    values.set(decodeXml(match[1].trim()), decodeXml(match[3].trim()));
  }

  const result = {};
  for (const [name, key] of Object.entries(REQUIRED_PLIST_KEYS)) {
    const value = values.get(key);
    if (!value) throw new Error(`Info.plist is missing ${key}`);
    result[name] = value;
  }
  return result;
}

export function parseArchiveLayout(listing) {
  const paths = [...listing.matchAll(/^Path = (.+)$/gmu)].map((match) => match[1]);
  const roots = new Set();
  for (const path of paths) {
    const match = path.match(/^(.*\/ChatGPT\.app)\/Contents\/Info\.plist$/u);
    if (match) roots.add(match[1]);
  }

  const complete = [...roots].map((appRoot) => ({
    appRoot,
    asar: `${appRoot}/Contents/Resources/app.asar`,
    icon: `${appRoot}/Contents/Resources/icon-chatgpt.png`,
    infoPlist: `${appRoot}/Contents/Info.plist`,
  })).filter((layout) => [layout.asar, layout.icon, layout.infoPlist]
    .every((path) => paths.includes(path)));

  if (complete.length === 0) {
    throw new Error("archive does not contain a complete ChatGPT.app");
  }
  if (complete.length !== 1) {
    throw new Error("archive must contain exactly one complete ChatGPT.app");
  }
  return complete[0];
}

export function inspectAppMetadata(infoPlist, packageJson) {
  const plist = parseInfoPlist(infoPlist);
  for (const field of ["name", "version", "main"]) {
    if (typeof packageJson[field] !== "string" || packageJson[field].length === 0) {
      throw new Error(`ASAR package.json is missing ${field}`);
    }
  }
  if (plist.version !== packageJson.version) {
    throw new Error(
      `app version mismatch: Info.plist=${plist.version}, package.json=${packageJson.version}`,
    );
  }

  const electronVersion = packageJson.devDependencies?.electron;
  if (typeof electronVersion !== "string" || !/^\d+\.\d+\.\d+$/u.test(electronVersion)) {
    throw new Error("ASAR package.json has no exact Electron version");
  }

  const nativeModules = {};
  for (const name of ["better-sqlite3", "node-pty"]) {
    const version = packageJson.dependencies?.[name];
    if (typeof version === "string") nativeModules[name] = version;
  }

  return {
    app: {
      build: plist.build,
      bundleId: plist.bundleId,
      executable: plist.executable,
      main: packageJson.main,
      name: packageJson.name,
      version: plist.version,
    },
    electron: { version: electronVersion },
    nativeModules,
  };
}

async function hashFile(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function findExecutable(names, envPath = process.env.PATH ?? "") {
  for (const directory of envPath.split(delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      const candidate = join(directory, name);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep searching.
      }
    }
  }
  throw new Error(`required command not found: ${names.join(" or ")}`);
}

export async function inspectDmg(inputPath, options = {}) {
  const dmgPath = await realpath(inputPath);
  const dmgStat = await stat(dmgPath);
  if (!dmgStat.isFile()) throw new Error(`not a file: ${dmgPath}`);

  const sevenZip = options.sevenZip ?? await findExecutable(["7zz", "7z"]);
  const { stdout: listing } = await execFileAsync(
    sevenZip,
    ["l", "-slt", dmgPath],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  const layout = parseArchiveLayout(listing);
  const workDir = await mkdtemp(join(tmpdir(), "chatgpt-linux-inspect-"));

  try {
    await execFileAsync(
      sevenZip,
      [
        "x",
        "-y",
        `-o${workDir}`,
        dmgPath,
        layout.infoPlist,
        layout.asar,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    const infoPath = join(workDir, layout.infoPlist);
    const asarPath = join(workDir, layout.asar);
    const infoPlist = await readFile(infoPath, "utf8");
    const packageJson = JSON.parse(extractFile(asarPath, "package.json").toString("utf8"));
    const metadata = inspectAppMetadata(infoPlist, packageJson);
    const asarStat = await stat(asarPath);

    return {
      schemaVersion: 1,
      ...metadata,
      source: {
        asar: {
          sha256: await hashFile(asarPath),
          sizeBytes: asarStat.size,
        },
        dmg: {
          fileName: dmgPath.split("/").at(-1),
          sha256: await hashFile(dmgPath),
          sizeBytes: dmgStat.size,
        },
      },
    };
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}
