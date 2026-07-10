import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import { join } from "node:path";
import test from "node:test";

const serverScript = new URL("../runtime/webview_server.py", import.meta.url);

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

test("webview server is private, health-checked, and never caches", async (t) => {
  const directory = await mkdtemp(join(os.tmpdir(), "chatgpt-webview-"));
  const port = await freePort();
  const token = "test-health-token";
  await writeFile(join(directory, "index.html"), "official webview\n");

  const child = spawn("python3", [
    serverScript.pathname,
    "--bind", "127.0.0.1",
    "--port", String(port),
    "--directory", directory,
    "--health-token", token,
  ], { stdio: "ignore" });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise((resolve) => child.once("exit", resolve));
    }
    await rm(directory, { force: true, recursive: true });
  });

  let health;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      health = await fetch(`http://127.0.0.1:${port}/__chatgpt_linux_health__`);
      break;
    } catch {
      if (child.exitCode !== null) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }

  assert.ok(health, "server did not become ready");
  assert.equal(await health.text(), token);
  assert.equal(health.headers.get("cache-control"), "no-store");

  const index = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(await index.text(), "official webview\n");
  assert.equal(index.headers.get("cache-control"), "no-store");
  assert.equal(index.headers.get("pragma"), "no-cache");
});
