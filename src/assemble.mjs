import { createPackageWithOptions, extractAll, extractFile } from "@electron/asar";
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { run } from "./command.mjs";
import { installBrowserRuntime } from "./browser-runtime.mjs";
import { ensureElectronArchive } from "./electron-runtime.mjs";
import { patchBetterSqlite3Directory } from "./native-modules.mjs";
import { applyPatches } from "./patches/index.mjs";
import { findExecutable, inspectDmg, parseArchiveLayout } from "./upstream.mjs";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const rebuildCli = join(repoRoot, "node_modules", "@electron", "rebuild", "lib", "cli.js");

export function selectedResourceMembers(appRoot) {
  const resources = `${appRoot}/Contents/Resources`;
  return [
    `${resources}/app.asar`,
    `${resources}/app.asar.unpacked/*`,
    `${resources}/plugins/*`,
    `${resources}/skills/*`,
    `${resources}/icon-chatgpt.png`,
    `${resources}/codex-notification.wav`,
  ];
}

export function nativeBuildManifest(versions) {
  for (const name of ["better-sqlite3", "node-pty"]) {
    if (!/^\d+\.\d+\.\d+$/u.test(versions[name] ?? "")) {
      throw new Error(`expected exact native module version for ${name}`);
    }
  }
  return {
    dependencies: {
      "better-sqlite3": versions["better-sqlite3"],
      "node-pty": versions["node-pty"],
    },
    private: true,
  };
}

export function nativeRuntimeFiles() {
  return [
    "better-sqlite3/build/Release/better_sqlite3.node",
    "node-pty/build/Release/pty.node",
  ];
}

export function pluginCompatibilityPlan() {
  return {
    removedFiles: [
      "chrome/extension-host/macos",
      "latex/bin/tectonic",
    ],
    removedPlugins: ["computer-use", "record-and-replay"],
  };
}

async function pruneUnsupportedPluginResources(resourcesDir) {
  const pluginsDir = join(resourcesDir, "plugins", "openai-bundled", "plugins");
  const plan = pluginCompatibilityPlan();
  for (const plugin of plan.removedPlugins) {
    await rm(join(pluginsDir, plugin), { force: true, recursive: true });
  }
  for (const path of plan.removedFiles) {
    await rm(join(pluginsDir, path), { force: true, recursive: true });
  }
  return plan;
}

function bundledNativeVersions(asarPath) {
  return Object.fromEntries(["better-sqlite3", "node-pty"].map((name) => {
    const packageJson = JSON.parse(
      extractFile(asarPath, `node_modules/${name}/package.json`).toString("utf8"),
    );
    return [name, packageJson.version];
  }));
}

async function buildNativeModules({ electronVersion, targetUnpacked, workDir }) {
  const asarPath = join(dirname(targetUnpacked), "app.asar");
  const versions = bundledNativeVersions(asarPath);
  const nativeDir = join(workDir, "native");
  await rm(nativeDir, { force: true, recursive: true });
  await mkdir(nativeDir, { recursive: true });
  const lockedManifest = JSON.parse(
    await readFile(join(repoRoot, "native", "package.json"), "utf8"),
  );
  const expectedManifest = nativeBuildManifest(versions);
  if (JSON.stringify(lockedManifest.dependencies) !== JSON.stringify(expectedManifest.dependencies)) {
    throw new Error(
      `native lock does not match upstream modules: expected ${JSON.stringify(expectedManifest.dependencies)}`,
    );
  }
  await copyFile(join(repoRoot, "native", "package.json"), join(nativeDir, "package.json"));
  await copyFile(
    join(repoRoot, "native", "package-lock.json"),
    join(nativeDir, "package-lock.json"),
  );
  console.error(`Installing native sources: better-sqlite3@${versions["better-sqlite3"]}, node-pty@${versions["node-pty"]}`);
  await run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: nativeDir });
  await patchBetterSqlite3Directory(join(nativeDir, "node_modules", "better-sqlite3"));
  await run(process.execPath, [
    rebuildCli,
    "--module-dir", nativeDir,
    "--only", "better-sqlite3,node-pty",
    "--version", electronVersion,
    "--force",
    "--build-from-source",
    "--jobs", process.env.CHATGPT_BUILD_JOBS ?? "8",
  ]);

  for (const runtimeFile of nativeRuntimeFiles()) {
    const destination = join(targetUnpacked, "node_modules", runtimeFile);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(nativeDir, "node_modules", runtimeFile), destination);
    await chmod(destination, 0o644);
  }
  return versions;
}

async function extractOfficialResources({ dmgPath, layout, sourceDir, sevenZip }) {
  await run(sevenZip, [
    "x",
    "-y",
    `-o${sourceDir}`,
    dmgPath,
    ...selectedResourceMembers(layout.appRoot),
  ]);
  return join(sourceDir, layout.appRoot, "Contents", "Resources");
}

async function copyIfPresent(source, destination) {
  try {
    await cp(source, destination, { recursive: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

export async function assembleApp(inputPath, options = {}) {
  if (process.platform !== "linux" || process.arch !== "x64") {
    throw new Error("v1 assembly requires Linux x64");
  }
  const dmgPath = await realpath(inputPath);
  const buildDir = options.buildDir ?? join(repoRoot, "build");
  const appDir = options.appDir ?? join(buildDir, "app");
  const workDir = options.workDir ?? join(buildDir, "work");
  const sourceDir = join(workDir, "source");
  await rm(appDir, { force: true, recursive: true });
  await rm(workDir, { force: true, recursive: true });
  await mkdir(sourceDir, { recursive: true });

  const sevenZip = options.sevenZip ?? await findExecutable(["7zz", "7z"]);
  const { stdout: listing } = await run(sevenZip, ["l", "-slt", dmgPath], { capture: true });
  const layout = parseArchiveLayout(listing);
  const metadata = await inspectDmg(dmgPath, { sevenZip });
  const sourceResources = await extractOfficialResources({
    dmgPath,
    layout,
    sevenZip,
    sourceDir,
  });

  const electron = await ensureElectronArchive(metadata.electron.version, {
    source: options.electronZip ?? process.env.CHATGPT_ELECTRON_ZIP,
  });
  await mkdir(appDir, { recursive: true });
  await run("unzip", ["-q", "-o", electron.path, "-d", appDir]);
  await rename(join(appDir, "electron"), join(appDir, "chatgpt-desktop"));

  const targetResources = join(appDir, "resources");
  await copyFile(join(sourceResources, "app.asar"), join(targetResources, "app.asar"));
  await cp(
    join(sourceResources, "app.asar.unpacked"),
    join(targetResources, "app.asar.unpacked"),
    { recursive: true },
  );
  await copyIfPresent(join(sourceResources, "plugins"), join(targetResources, "plugins"));
  await copyIfPresent(join(sourceResources, "skills"), join(targetResources, "skills"));
  const pluginCompatibility = await pruneUnsupportedPluginResources(targetResources);
  await copyIfPresent(
    join(sourceResources, "codex-notification.wav"),
    join(targetResources, "codex-notification.wav"),
  );
  await copyFile(join(sourceResources, "icon-chatgpt.png"), join(targetResources, "icon-chatgpt.png"));
  const browserRuntime = await installBrowserRuntime(targetResources, workDir, {
    source: options.browserRuntimeArchive ?? process.env.CHATGPT_BROWSER_RUNTIME_ARCHIVE,
  });
  await copyFile(join(repoRoot, "runtime", "launch.sh"), join(appDir, "start.sh"));
  await chmod(join(appDir, "start.sh"), 0o755);
  const runtimeDir = join(appDir, ".chatgpt-linux");
  await mkdir(runtimeDir, { recursive: true });
  await copyFile(
    join(repoRoot, "runtime", "webview_server.py"),
    join(runtimeDir, "webview_server.py"),
  );

  const nativeModules = await buildNativeModules({
    electronVersion: metadata.electron.version,
    targetUnpacked: join(targetResources, "app.asar.unpacked"),
    workDir,
  });

  const asarExtracted = join(workDir, "asar");
  await extractAll(join(targetResources, "app.asar"), asarExtracted);
  await cp(join(asarExtracted, "webview"), join(appDir, "content", "webview"), {
    recursive: true,
  });
  const patches = await applyPatches(asarExtracted);
  await rm(join(targetResources, "app.asar"), { force: true });
  await rm(join(targetResources, "app.asar.unpacked"), { force: true, recursive: true });
  await createPackageWithOptions(
    asarExtracted,
    join(targetResources, "app.asar"),
    { unpack: "**/*.node" },
  );

  const buildInfo = {
    schemaVersion: 1,
    app: metadata.app,
    electron: {
      ...metadata.electron,
      artifact: electron.artifact,
      sha256: electron.sha256,
    },
    nativeModules,
    browserRuntime,
    patches,
    pluginCompatibility,
    source: metadata.source,
  };
  await writeFile(
    join(targetResources, "chatgpt-linux-build.json"),
    `${JSON.stringify(buildInfo, null, 2)}\n`,
  );
  return { appDir, buildInfo };
}
