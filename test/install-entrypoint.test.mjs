import assert from "node:assert/strict";
import {
  chmod,
  copyFile,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const install = new URL("../install.sh", import.meta.url);

test("public install entrypoint exposes its one-command interface", async () => {
  const { stdout } = await execFileAsync("bash", [install.pathname, "--help"]);
  assert.equal(stdout.trim(), "Usage: ./install.sh");
});

test("public install entrypoint downloads, builds, and installs one fresh package", async () => {
  const workDir = await mkdtemp(join(tmpdir(), "chatgpt-install-test-"));
  const binDir = join(workDir, "bin");
  const trace = join(workDir, "trace");
  const fixtureInstall = join(workDir, "install.sh");
  await execFileAsync("mkdir", ["-p", binDir]);
  await copyFile(install, fixtureInstall);
  await chmod(fixtureInstall, 0o755);

  await writeFile(join(workDir, "download.sh"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'download %s\n' "$1" >>"$TRACE"
printf 'official dmg' >"$1"
`);
  await writeFile(join(workDir, "build.sh"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'build %s\n' "$1" >>"$TRACE"
mkdir -p "$(dirname "$0")/dist"
printf 'deb' >"$(dirname "$0")/dist/chatgpt-desktop_9.9.9_amd64.deb"
`);
  await writeFile(join(binDir, "sudo"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'sudo' >>"$TRACE"
printf ' %s' "$@" >>"$TRACE"
printf '\n' >>"$TRACE"
`);
  await Promise.all([
    chmod(join(workDir, "download.sh"), 0o755),
    chmod(join(workDir, "build.sh"), 0o755),
    chmod(join(binDir, "sudo"), 0o755),
  ]);

  const { stdout } = await execFileAsync("bash", [fixtureInstall], {
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      TRACE: trace,
    },
  });
  const calls = await readFile(trace, "utf8");

  assert.match(calls, /^download .*\/ChatGPT\.dmg$/mu);
  assert.match(calls, /^build .*\/ChatGPT\.dmg$/mu);
  assert.match(
    calls,
    /^sudo apt-get install --yes .*\/dist\/chatgpt-desktop_9\.9\.9_amd64\.deb$/mu,
  );
  assert.match(stdout, /Installed chatgpt-desktop_9\.9\.9_amd64\.deb/);
  assert.match(stdout, /Running ChatGPT processes were not restarted/);
});
