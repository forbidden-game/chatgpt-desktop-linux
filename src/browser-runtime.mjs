import { createWriteStream } from "node:fs";
import { access, chmod, copyFile, mkdir, realpath, rename, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { run } from "./command.mjs";
import { sha256File } from "./electron-runtime.mjs";

const VERSION = "26.426.12240";
const ARTIFACT = `codex-primary-runtime-linux-x64-${VERSION}.tar.xz`;
const URL = `https://persistent.oaistatic.com/codex-primary-runtime/${VERSION}/${ARTIFACT}`;
const SHA256 = "db5624eb6efa36b66ec6f6dd0488cefb966e49636862aab6209a4336c1ca90c4";
const MEMBER = "codex-primary-runtime/dependencies/bin/node_repl";

export function browserRuntimeRelease(arch = process.arch) {
  if (arch !== "x64") throw new Error(`v1 browser runtime supports x64 only, not ${arch}`);
  return { artifact: ARTIFACT, sha256: SHA256, url: URL, version: VERSION };
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

export async function installBrowserRuntime(resourcesDir, workDir, options = {}) {
  const release = browserRuntimeRelease(options.arch);
  const cacheDir = options.cacheDir ?? join(
    homedir(),
    ".cache",
    "chatgpt-desktop-linux",
    "browser-runtime",
  );
  await mkdir(cacheDir, { recursive: true });

  const archive = options.source
    ? await realpath(options.source)
    : join(cacheDir, release.artifact);
  if (!options.source && !await exists(archive)) {
    const partial = `${archive}.partial`;
    await rm(partial, { force: true });
    console.error(`Downloading ${release.artifact}`);
    await download(release.url, partial);
    await rename(partial, archive);
  }
  if (options.source && basename(archive) !== release.artifact) {
    console.error(`Using browser runtime override: ${archive}`);
  }

  const actual = await sha256File(archive);
  if (actual !== release.sha256) {
    throw new Error(`browser runtime checksum mismatch: expected ${release.sha256}, got ${actual}`);
  }

  const extractDir = join(workDir, "browser-runtime");
  await rm(extractDir, { force: true, recursive: true });
  await mkdir(extractDir, { recursive: true });
  await run("tar", ["-xJf", archive, "-C", extractDir, MEMBER]);
  const destination = join(resourcesDir, "node_repl");
  await copyFile(join(extractDir, MEMBER), destination);
  await chmod(destination, 0o755);
  return { ...release, sha256: actual };
}
