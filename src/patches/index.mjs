import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  applyLinuxDesktopIdentityPatch,
  applyLinuxDesktopShellPatch,
  selectBootstrapBundle,
  selectMainBundle,
} from "./desktop-shell.mjs";
import { applyLinuxChromeExtensionPatch } from "./chrome-extension.mjs";
import { applyGitWatcherPatch } from "./git-watcher.mjs";
import { applyOptInMemoryProbePatch } from "./memory-probe.mjs";

export async function applyPatches(asarDir) {
  const worker = join(asarDir, ".vite", "build", "worker.js");
  const source = await readFile(worker, "utf8");
  const patched = applyGitWatcherPatch(source);
  await writeFile(worker, patched);

  const buildDir = join(asarDir, ".vite", "build");
  const main = join(buildDir, selectMainBundle(await readdir(buildDir)));
  const mainSource = await readFile(main, "utf8");
  const chromePatchedMain = applyLinuxChromeExtensionPatch(mainSource);
  const desktopPatchedMain = applyLinuxDesktopShellPatch(chromePatchedMain);
  const patchedMain = applyOptInMemoryProbePatch(desktopPatchedMain);
  await writeFile(main, patchedMain);

  const bootstrap = join(buildDir, selectBootstrapBundle(await readdir(buildDir)));
  const bootstrapSource = await readFile(bootstrap, "utf8");
  const patchedBootstrap = applyLinuxDesktopIdentityPatch(bootstrapSource);
  await writeFile(bootstrap, patchedBootstrap);

  return [{
    id: "valid-git-marker",
    status: patched === source ? "already-applied" : "applied",
  }, {
    id: "linux-chrome-extension",
    status: chromePatchedMain === mainSource ? "already-applied" : "applied",
  }, {
    id: "linux-desktop-shell",
    status: desktopPatchedMain === chromePatchedMain ? "already-applied" : "applied",
  }, {
    id: "opt-in-memory-probe",
    status: patchedMain === desktopPatchedMain ? "already-applied" : "applied",
  }, {
    id: "linux-desktop-identity",
    status: patchedBootstrap === bootstrapSource ? "already-applied" : "applied",
  }];
}
