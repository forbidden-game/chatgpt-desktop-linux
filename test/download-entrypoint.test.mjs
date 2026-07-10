import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const download = new URL("../download.sh", import.meta.url);

test("public download entrypoint documents its default destination", async () => {
  const { stdout } = await execFileAsync("bash", [download.pathname, "--help"]);
  assert.equal(stdout.trim(), "Usage: ./download.sh [output.dmg]");
});

test("public download entrypoint saves atomically and refuses overwrite", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "chatgpt-download-test-"));
  const binDir = join(workDir, "bin");
  const output = join(workDir, "downloads", "ChatGPT.dmg");
  const fakeCurl = join(binDir, "curl");
  await execFileAsync("mkdir", ["-p", binDir]);
  await writeFile(fakeCurl, `#!/usr/bin/env bash
set -Eeuo pipefail
while (($#)); do
  if [[ "$1" == "--output" ]]; then
    shift
    printf 'official dmg' >"$1"
    exit 0
  fi
  shift
done
exit 2
`);
  await chmod(fakeCurl, 0o755);

  const env = {
    ...process.env,
    CHATGPT_DMG_URL: "https://example.invalid/ChatGPT.dmg",
    PATH: `${binDir}:${process.env.PATH}`,
  };
  const first = await execFileAsync("bash", [download.pathname, output], { env });
  assert.match(first.stdout, /Saved official ChatGPT DMG to/);
  assert.equal(await readFile(output, "utf8"), "official dmg");

  await assert.rejects(
    execFileAsync("bash", [download.pathname, output], { env }),
    /Refusing to overwrite existing file/,
  );
});
