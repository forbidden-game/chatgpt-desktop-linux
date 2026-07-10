import {
  chmod,
  copyFile,
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { run } from "./command.mjs";

const repoRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));

function validateVersion(version) {
  if (!/^[0-9][0-9A-Za-z.+~]*$/u.test(version)) {
    throw new Error(`invalid Debian version: ${version}`);
  }
  return version;
}

export function packageFileName(version) {
  return `chatgpt-desktop_${validateVersion(version)}_amd64.deb`;
}

export function debianControl({ installedSizeKiB, version }) {
  validateVersion(version);
  if (!Number.isSafeInteger(installedSizeKiB) || installedSizeKiB < 1) {
    throw new Error("installedSizeKiB must be a positive integer");
  }
  return `Package: chatgpt-desktop
Version: ${version}
Architecture: amd64
Maintainer: Xiezhao Pan <panxiezhao@gmail.com>
Section: utils
Priority: optional
Installed-Size: ${installedSizeKiB}
Depends: curl, python3, nodejs (>= 18), util-linux, xdg-utils, libasound2t64 | libasound2, libatk-bridge2.0-0, libatk1.0-0, libc6, libcairo2, libcups2t64 | libcups2, libdbus-1-3, libdrm2, libgbm1, libglib2.0-0t64 | libglib2.0-0, libgtk-3-0t64 | libgtk-3-0, libnspr4, libnss3, libpango-1.0-0, libstdc++6, libx11-6, libx11-xcb1, libxcb-dri3-0, libxcb1, libxcomposite1, libxdamage1, libxext6, libxfixes3, libxkbcommon0, libxrandr2
Description: Unofficial ChatGPT desktop compatibility build for Linux
 Built locally from a user-supplied official ChatGPT DMG.
 The Codex CLI must be installed separately and available in PATH.
 Updates are manual.
`;
}

export function desktopEntry() {
  return `[Desktop Entry]
Type=Application
Name=ChatGPT
Comment=ChatGPT desktop application
Exec=chatgpt-desktop %U
Icon=chatgpt-desktop
Terminal=false
Categories=Utility;
StartupNotify=true
StartupWMClass=chatgpt-desktop
`;
}

async function installedSize(appDir) {
  const { stdout } = await run("du", ["-sk", appDir], { capture: true });
  const size = Number.parseInt(stdout.split(/\s+/u)[0], 10);
  if (!Number.isSafeInteger(size) || size < 1) {
    throw new Error(`could not measure installed size: ${stdout.trim()}`);
  }
  return size;
}

async function normalizeTimes(path, epochSeconds) {
  const entry = await lstat(path);
  if (entry.isDirectory()) {
    for (const name of await readdir(path)) {
      await normalizeTimes(join(path, name), epochSeconds);
    }
  }
  if (!entry.isSymbolicLink()) await utimes(path, epochSeconds, epochSeconds);
}

export async function packageDeb(appDir, options = {}) {
  const buildInfo = JSON.parse(
    await readFile(join(appDir, "resources", "chatgpt-linux-build.json"), "utf8"),
  );
  const version = validateVersion(buildInfo.app?.version ?? "");
  const distDir = options.distDir ?? join(repoRoot, "dist");
  const packageRoot = options.packageRoot ?? join(repoRoot, "build", "deb-root");
  const appTarget = join(packageRoot, "opt", "chatgpt-desktop");
  const output = join(distDir, packageFileName(version));

  await rm(packageRoot, { force: true, recursive: true });
  await mkdir(join(packageRoot, "DEBIAN"), { recursive: true });
  await mkdir(join(packageRoot, "opt"), { recursive: true });
  await mkdir(join(packageRoot, "usr", "bin"), { recursive: true });
  await mkdir(join(packageRoot, "usr", "share", "applications"), { recursive: true });
  await mkdir(
    join(packageRoot, "usr", "share", "icons", "hicolor", "1024x1024", "apps"),
    { recursive: true },
  );
  await mkdir(join(packageRoot, "usr", "share", "doc", "chatgpt-desktop"), {
    recursive: true,
  });
  await cp(appDir, appTarget, { preserveTimestamps: true, recursive: true });

  const control = join(packageRoot, "DEBIAN", "control");
  await writeFile(
    control,
    debianControl({ installedSizeKiB: await installedSize(appDir), version }),
  );
  await chmod(control, 0o644);
  const command = join(packageRoot, "usr", "bin", "chatgpt-desktop");
  await writeFile(command, "#!/bin/sh\nexec /opt/chatgpt-desktop/start.sh \"$@\"\n");
  await chmod(command, 0o755);
  const desktop = join(
    packageRoot,
    "usr",
    "share",
    "applications",
    "chatgpt-desktop.desktop",
  );
  await writeFile(
    desktop,
    desktopEntry(),
  );
  await chmod(desktop, 0o644);
  await copyFile(
    join(appTarget, "resources", "icon-chatgpt.png"),
    join(
      packageRoot,
      "usr",
      "share",
      "icons",
      "hicolor",
      "1024x1024",
      "apps",
      "chatgpt-desktop.png",
    ),
  );
  await copyFile(join(repoRoot, "LICENSE"), join(
    packageRoot,
    "usr",
    "share",
    "doc",
    "chatgpt-desktop",
    "copyright",
  ));
  await copyFile(join(repoRoot, "NOTICE.md"), join(
    packageRoot,
    "usr",
    "share",
    "doc",
    "chatgpt-desktop",
    "NOTICE.md",
  ));

  await mkdir(distDir, { recursive: true });
  await rm(output, { force: true });
  const sourceDateEpoch = Number.parseInt(
    options.sourceDateEpoch ?? process.env.SOURCE_DATE_EPOCH ?? "315532800",
    10,
  );
  if (!Number.isSafeInteger(sourceDateEpoch) || sourceDateEpoch < 0) {
    throw new Error("SOURCE_DATE_EPOCH must be a non-negative integer");
  }
  await normalizeTimes(packageRoot, sourceDateEpoch);
  await run("dpkg-deb", ["--root-owner-group", "--build", packageRoot, output], {
    env: { ...process.env, SOURCE_DATE_EPOCH: String(sourceDateEpoch) },
  });
  return { output, version };
}
