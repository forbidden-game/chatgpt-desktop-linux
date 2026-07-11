import assert from "node:assert/strict";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { execFile } from "node:child_process";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const install = new URL("../install.sh", import.meta.url);

async function createFixture({ nodeMajor, withCodex = true } = {}) {
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
if [[ "\${FAIL_BUILD:-0}" == 1 ]]; then exit 23; fi
mkdir -p "$(dirname "$0")/dist"
printf 'deb' >"$(dirname "$0")/dist/chatgpt-desktop_9.9.9_amd64.deb"
`);
  await writeFile(join(binDir, "sudo"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'sudo' >>"$TRACE"
printf ' %s' "$@" >>"$TRACE"
printf '\n' >>"$TRACE"
`);
  if (withCodex) {
    await writeFile(join(binDir, "codex"), `#!/usr/bin/env bash
echo codex-cli-test
`);
  } else {
    await writeFile(join(binDir, "npm"), `#!/usr/bin/env bash
set -Eeuo pipefail
printf 'npm' >>"$TRACE"
printf ' %s' "$@" >>"$TRACE"
printf '\n' >>"$TRACE"
prefix=""
while (($#)); do
  if [[ "$1" == --prefix ]]; then prefix="$2"; shift 2; else shift; fi
done
mkdir -p "$prefix/node_modules/.bin"
printf '#!/usr/bin/env bash\necho codex-cli-installed\n' >"$prefix/node_modules/.bin/codex"
chmod 0755 "$prefix/node_modules/.bin/codex"
`);
  }
  if (nodeMajor !== undefined) {
    await writeFile(join(binDir, "node"), `#!/usr/bin/env bash
case "$1" in
  -p) echo ${nodeMajor} ;;
  --version) echo v${nodeMajor}.0.0 ;;
  *) exit 2 ;;
esac
`);
  }
  await Promise.all([
    chmod(join(workDir, "download.sh"), 0o755),
    chmod(join(workDir, "build.sh"), 0o755),
    chmod(join(binDir, "sudo"), 0o755),
    ...(withCodex
      ? [chmod(join(binDir, "codex"), 0o755)]
      : [chmod(join(binDir, "npm"), 0o755)]),
    ...(nodeMajor === undefined ? [] : [chmod(join(binDir, "node"), 0o755)]),
  ]);

  return {
    env: {
      ...process.env,
      HOME: join(workDir, "home"),
      PATH: `${binDir}:${withCodex ? process.env.PATH : `${dirname(process.execPath)}:/usr/bin:/bin`}`,
      TRACE: trace,
    },
    fixtureInstall,
    trace,
    workDir,
  };
}

async function createNodeDistribution(workDir) {
  const release = "v22.99.0";
  const archiveName = `node-${release}-linux-x64.tar.xz`;
  const distDir = join(workDir, "node-dist");
  const releaseDir = join(distDir, release);
  const payloadParent = join(workDir, "node-payload");
  const payload = join(payloadParent, `node-${release}-linux-x64`);
  await mkdir(join(payload, "bin"), { recursive: true });
  await mkdir(releaseDir, { recursive: true });
  await writeFile(join(payload, "bin", "node"), `#!/usr/bin/env bash
case "$1" in
  -p) echo 22 ;;
  --version) echo ${release} ;;
  *) exit 0 ;;
esac
`);
  await writeFile(join(payload, "bin", "npm"), `#!/usr/bin/env bash
echo npm-test
`);
  await Promise.all([
    chmod(join(payload, "bin", "node"), 0o755),
    chmod(join(payload, "bin", "npm"), 0o755),
  ]);
  const archive = join(releaseDir, archiveName);
  await execFileAsync("tar", ["-cJf", archive, "-C", payloadParent, `node-${release}-linux-x64`]);
  const { stdout } = await execFileAsync("sha256sum", [archive]);
  const checksum = stdout.split(/\s+/u)[0];
  const sums = join(workDir, "SHASUMS256.txt");
  await writeFile(sums, `${checksum}  ${archiveName}\n`);
  return {
    installDir: join(workDir, "home", ".local", "share", "chatgpt-desktop-linux", `node-${release}`),
    sumsUrl: `file://${sums}`,
    distBase: `file://${distDir}`,
  };
}

test("public install entrypoint exposes its one-command interface", async () => {
  const { stdout } = await execFileAsync("bash", [install.pathname, "--help"]);
  assert.equal(stdout.trim(), "Usage: ./install.sh");
});

test("public install entrypoint downloads, builds, and installs one fresh package", async () => {
  const fixture = await createFixture();
  try {
    const { stdout } = await execFileAsync("bash", [fixture.fixtureInstall], {
      env: fixture.env,
    });
    const calls = await readFile(fixture.trace, "utf8");

    assert.match(calls, /^sudo apt-get update$/mu);
    assert.match(calls, /^sudo apt-get install --yes .*build-essential.*7zip/mu);
    assert.match(calls, /^download .*\/ChatGPT\.dmg$/mu);
    assert.match(calls, /^build .*\/ChatGPT\.dmg$/mu);
    assert.match(
      calls,
      /^sudo apt-get install --yes .*\/dist\/chatgpt-desktop_9\.9\.9_amd64\.deb$/mu,
    );
    assert.match(stdout, /\[1\/8\] Checking supported system/);
    assert.match(stdout, /\[8\/8\] Installing the freshly built Debian package/);
    assert.match(stdout, /Installed chatgpt-desktop_9\.9\.9_amd64\.deb/);
    assert.match(stdout, /Running ChatGPT processes were not restarted/);
    assert.equal(
      await readlink(join(fixture.env.HOME, ".local", "bin", "codex")),
      join(fixture.workDir, "bin", "codex"),
    );
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});

test("public install entrypoint identifies the failed step", async () => {
  const fixture = await createFixture();
  try {
    await assert.rejects(
      execFileAsync("bash", [fixture.fixtureInstall], {
        env: { ...fixture.env, FAIL_BUILD: "1" },
      }),
      (error) => {
        assert.equal(error.code, 23);
        assert.match(error.stderr, /Step 7\/8 failed: Building the Debian package/);
        return true;
      },
    );
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});

test("public install entrypoint installs a verified local Node.js 22 when needed", async () => {
  const fixture = await createFixture({ nodeMajor: 18 });
  try {
    const nodeDistribution = await createNodeDistribution(fixture.workDir);
    const { stdout } = await execFileAsync("bash", [fixture.fixtureInstall], {
      env: {
        ...fixture.env,
        CHATGPT_NODE_DIST_BASE: nodeDistribution.distBase,
        CHATGPT_NODE_SHASUMS_URL: nodeDistribution.sumsUrl,
      },
    });
    assert.match(stdout, /Using v22\.99\.0 from/);
    await access(join(nodeDistribution.installDir, "bin", "node"));
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});

test("public install entrypoint installs the Codex CLI when it is missing", async () => {
  const fixture = await createFixture({ withCodex: false });
  try {
    const { stdout } = await execFileAsync("bash", [fixture.fixtureInstall], {
      env: fixture.env,
    });
    const calls = await readFile(fixture.trace, "utf8");
    assert.match(calls, /^npm install --prefix .* @openai\/codex@latest$/mu);
    assert.match(stdout, /Using codex-cli-installed from/);
    await access(join(fixture.env.HOME, ".local", "bin", "codex"));
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});

test("public install entrypoint preserves a user-managed Codex link", async () => {
  const fixture = await createFixture();
  const codexLink = join(fixture.env.HOME, ".local", "bin", "codex");
  const managedTarget = "/user/managed/codex";
  try {
    await mkdir(dirname(codexLink), { recursive: true });
    await symlink(managedTarget, codexLink);
    await assert.rejects(
      execFileAsync("bash", [fixture.fixtureInstall], { env: fixture.env }),
      (error) => {
        assert.match(error.stderr, /Refusing to replace user-managed Codex link/);
        assert.match(error.stderr, /Step 5\/8 failed/);
        return true;
      },
    );
    assert.equal(await readlink(codexLink), managedTarget);
  } finally {
    await rm(fixture.workDir, { force: true, recursive: true });
  }
});
