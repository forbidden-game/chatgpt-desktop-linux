import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const requiredFiles = [
  ".gitignore",
  "AGENTS.md",
  "build.sh",
  "download.sh",
  "README.md",
  "NOTICE.md",
  "native/package-lock.json",
  "native/package.json",
  "docs/architecture.md",
  "docs/compatibility.md",
  "package.json",
  "runtime/webview_server.py",
];

await Promise.all(requiredFiles.map((file) => access(new URL(file, root))));

const gitignore = await readFile(new URL(".gitignore", root), "utf8");
for (const generated of ["/build/", "/dist/", "/node_modules/", "*.dmg", "*.deb"]) {
  assert.ok(gitignore.includes(generated), `missing generated-file guard: ${generated}`);
}

const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
assert.equal(pkg.private, true);
assert.equal(pkg.type, "module");
assert.equal(join("dist", "artifact.deb"), "dist/artifact.deb");

console.log("repository contract: ok");
