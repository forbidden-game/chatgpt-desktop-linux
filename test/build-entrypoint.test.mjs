import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("public build entrypoint validates the local toolchain", async () => {
  const build = new URL("../build.sh", import.meta.url);
  const { stdout } = await execFileAsync("bash", [build.pathname, "--check"]);
  assert.equal(stdout.trim(), "build dependencies: ok");
});

test("public build entrypoint exposes its one-command interface", async () => {
  const build = new URL("../build.sh", import.meta.url);
  const { stdout } = await execFileAsync("bash", [build.pathname, "--help"]);
  assert.equal(stdout.trim(), "Usage: ./build.sh /path/to/ChatGPT.dmg");
});
