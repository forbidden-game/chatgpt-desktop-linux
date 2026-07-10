import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, mkdir, realpath, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const RELEASES = "https://github.com/electron/electron/releases/download";

export function electronArtifactName(version, arch = process.arch) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    throw new Error(`invalid Electron version: ${version}`);
  }
  if (arch !== "x64") throw new Error(`v1 supports x64 only, not ${arch}`);
  return `electron-v${version}-linux-x64.zip`;
}

export function expectedElectronSha256(shasums, artifact) {
  for (const line of shasums.split(/\r?\n/u)) {
    const match = line.match(/^([a-f0-9]{64})\s+\*?(.+)$/u);
    if (match?.[2] === artifact) return match[1];
  }
  throw new Error(`Electron SHASUMS256.txt is missing ${artifact}`);
}

export async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, destination) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`download failed (${response.status}): ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
}

export async function ensureElectronArchive(version, options = {}) {
  const artifact = electronArtifactName(version, options.arch);
  const releaseUrl = `${RELEASES}/v${version}`;
  const response = await fetch(`${releaseUrl}/SHASUMS256.txt`, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`could not read Electron SHASUMS256.txt (${response.status})`);
  }
  const expected = expectedElectronSha256(await response.text(), artifact);
  const cacheDir = options.cacheDir ?? join(homedir(), ".cache", "chatgpt-desktop-linux", "electron");
  await mkdir(cacheDir, { recursive: true });

  let archive = options.source ? await realpath(options.source) : join(cacheDir, artifact);
  if (!options.source && !await exists(archive)) {
    const partial = `${archive}.partial`;
    await rm(partial, { force: true });
    console.error(`Downloading ${artifact}`);
    await download(`${releaseUrl}/${artifact}`, partial);
    await rename(partial, archive);
  }
  if (basename(archive) !== artifact && options.source) {
    console.error(`Using Electron archive override: ${archive}`);
  }

  const actual = await sha256File(archive);
  if (actual !== expected) {
    throw new Error(`Electron checksum mismatch: expected ${expected}, got ${actual}`);
  }
  return { artifact, path: archive, sha256: actual };
}
