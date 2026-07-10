import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  applyGitWatcherPatch,
  gitMarkerHelperSource,
} from "../src/patches/git-watcher.mjs";

const workerFixture = [
  "var W=class{",
  "async checkForGitDirectory(e){if(!this.disposed){try{await this.options.host.stat(e,{bypassCache:!0})}catch{return}this.disposed||(this.dispose(),this.options.onGitInit())}}",
  "};",
].join("");

async function markerReady(stat) {
  const context = { result: null };
  vm.runInNewContext(
    `${gitMarkerHelperSource()};result=chatgptLinuxGitMarkerReady({` +
      `stat:${stat},` +
      "platformPath:async()=>({join:(...parts)=>parts.join(`/`)})" +
      "},`/workspace/.git`)",
    context,
  );
  return context.result;
}

test("git watcher ignores an empty .git directory", async () => {
  const result = await markerReady(
    "async path=>{if(path.endsWith(`/HEAD`))throw Error(`missing`);return{isDirectory:()=>true}}",
  );
  assert.equal(result, false);
});

test("git watcher accepts repositories and worktree marker files", async () => {
  assert.equal(await markerReady("async()=>({isDirectory:()=>true})"), true);
  assert.equal(await markerReady("async()=>({isDirectory:()=>false})"), true);
});

test("git watcher patch is exact and idempotent", () => {
  const patched = applyGitWatcherPatch(workerFixture);
  assert.match(patched, /chatgptLinuxGitMarkerReady/);
  assert.match(patched, /await chatgptLinuxGitMarkerReady\(this\.options\.host,e\)/);
  assert.equal(applyGitWatcherPatch(patched), patched);
  assert.throws(() => applyGitWatcherPatch("upstream drift"), /unsupported Git watcher/);
});
