import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  browserRuntimeRelease,
  nodeReplSupervisorSource,
} from "../src/browser-runtime.mjs";

test("browser runtime release is pinned for reproducible x64 builds", () => {
  assert.deepEqual(browserRuntimeRelease("x64"), {
    artifact: "codex-primary-runtime-linux-x64-26.426.12240.tar.xz",
    sha256: "db5624eb6efa36b66ec6f6dd0488cefb966e49636862aab6209a4336c1ca90c4",
    url: "https://persistent.oaistatic.com/codex-primary-runtime/26.426.12240/codex-primary-runtime-linux-x64-26.426.12240.tar.xz",
    version: "26.426.12240",
  });
  assert.throws(() => browserRuntimeRelease("arm64"), /x64 only/u);
});

test("browser runtime resolves the packaged node_repl supervisor", async () => {
  const source = nodeReplSupervisorSource();

  assert.match(source.pathname, /\/runtime\/node_repl_supervisor\.py$/u);
  assert.match(await readFile(source, "utf8"), /^#!\/usr\/bin\/env python3\n/u);
});
