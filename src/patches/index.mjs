import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { applyGitWatcherPatch } from "./git-watcher.mjs";

export async function applyPatches(asarDir) {
  const worker = join(asarDir, ".vite", "build", "worker.js");
  const source = await readFile(worker, "utf8");
  const patched = applyGitWatcherPatch(source);
  await writeFile(worker, patched);
  return [{
    id: "valid-git-marker",
    status: patched === source ? "already-applied" : "applied",
  }];
}
