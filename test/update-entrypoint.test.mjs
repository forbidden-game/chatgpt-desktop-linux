import assert from "node:assert/strict";
import { chmod, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const update = new URL("../update.sh", import.meta.url);

async function createFixture() {
  const workDir = await mkdtemp(join(tmpdir(), "chatgpt-update-test-"));
  const binDir = join(workDir, "bin");
  const trace = join(workDir, "trace");
  const fixtureUpdate = join(workDir, "update.sh");

  await execFileAsync("mkdir", ["-p", binDir]);
  await copyFile(update, fixtureUpdate);
  await writeFile(join(binDir, "git"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'git' >>"$TRACE"
printf ' %s' "$@" >>"$TRACE"
printf '\n' >>"$TRACE"
if [[ "\${FAIL_GIT:-0}" == 1 ]]; then exit 19; fi
`);
  await writeFile(join(workDir, "install.sh"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'install\n' >>"$TRACE"
echo 'updated app installed'
`);
  await Promise.all([
    chmod(fixtureUpdate, 0o755),
    chmod(join(binDir, "git"), 0o755),
    chmod(join(workDir, "install.sh"), 0o755),
  ]);

  return {
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}`, TRACE: trace },
    fixtureUpdate,
    trace,
    workDir,
  };
}

test("public update entrypoint exposes its one-command interface", async () => {
  const { stdout } = await execFileAsync("bash", [update.pathname, "--help"]);
  assert.equal(stdout.trim(), "Usage: ./update.sh");
});

test("public update entrypoint fast-forwards the checkout before installing", async () => {
  const fixture = await createFixture();
  try {
    const { stdout } = await execFileAsync("bash", [fixture.fixtureUpdate], {
      env: fixture.env,
    });
    const calls = await readFile(fixture.trace, "utf8");

    assert.equal(
      calls,
      `git -C ${fixture.workDir} pull --ff-only\ninstall\n`,
    );
    assert.match(stdout, /\[1\/2\] Updating the source checkout/);
    assert.match(stdout, /\[2\/2\] Building and installing the updated app/);
    assert.match(stdout, /updated app installed/);
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});

test("public update entrypoint does not install when the pull fails", async () => {
  const fixture = await createFixture();
  try {
    await assert.rejects(
      execFileAsync("bash", [fixture.fixtureUpdate], {
        env: { ...fixture.env, FAIL_GIT: "1" },
      }),
      (error) => {
        assert.equal(error.code, 19);
        return true;
      },
    );
    const calls = await readFile(fixture.trace, "utf8");
    assert.equal(calls, `git -C ${fixture.workDir} pull --ff-only\n`);
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});
