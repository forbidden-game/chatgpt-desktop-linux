import assert from "node:assert/strict";
import test from "node:test";

import {
  debianControl,
  desktopEntry,
  packageFileName,
} from "../src/package-deb.mjs";

test("packageFileName uses the upstream app version", () => {
  assert.equal(
    packageFileName("26.707.30751"),
    "chatgpt-desktop_26.707.30751_amd64.deb",
  );
  assert.throws(() => packageFileName("bad version"), /invalid Debian version/);
});

test("Debian control is manual-update and Ubuntu focused", () => {
  const control = debianControl({ installedSizeKiB: 900_000, version: "26.707.30751" });
  assert.match(control, /^Package: chatgpt-desktop$/mu);
  assert.match(control, /^Architecture: amd64$/mu);
  assert.match(control, /^Depends: .*python3.*nodejs \(>= 18\).*util-linux/mu);
  assert.match(control, /^Installed-Size: 900000$/mu);
  assert.doesNotMatch(control, /updater|rpm|pacman/iu);
});

test("desktop entry launches the package without claiming codex URLs", () => {
  const entry = desktopEntry();
  assert.match(entry, /^Exec=chatgpt-desktop %U$/mu);
  assert.match(entry, /^Icon=chatgpt-desktop$/mu);
  assert.match(entry, /^StartupWMClass=chatgpt-desktop$/mu);
  assert.match(entry, /^Categories=Utility;$/mu);
  assert.doesNotMatch(entry, /MimeType|codex:\/\//u);
});
