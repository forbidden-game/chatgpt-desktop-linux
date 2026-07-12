import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  applyOptInMemoryProbePatch,
  memoryProbeRuntimeSource,
} from "../src/patches/memory-probe.mjs";

const mainFixture = "async function start(){}exports.runMainAppStartup=start;";

test("memory probe patch is exact and idempotent", () => {
  const patched = applyOptInMemoryProbePatch(mainFixture);

  assert.match(patched, /CHATGPT_MEMORY_PROBE_PATH/u);
  assert.equal(applyOptInMemoryProbePatch(patched), patched);
  assert.throws(
    () => applyOptInMemoryProbePatch("upstream drift"),
    /unsupported main process source for memory probe/u,
  );
  assert.throws(
    () => applyOptInMemoryProbePatch(`${mainFixture}${mainFixture}`),
    /unsupported main process source for memory probe/u,
  );
});

test("memory probe has no runtime effect unless explicitly enabled", () => {
  let required = false;
  const process = {
    env: {},
  };

  vm.runInNewContext(memoryProbeRuntimeSource(), {
    process,
    require() {
      required = true;
      throw new Error("require should not be called");
    },
  });

  assert.equal(required, false);
});

test("enabled memory probe writes bounded diagnostic samples", () => {
  const writes = [];
  const listeners = new Map();
  const timer = { unrefCalled: false };
  const process = {
    env: {
      CHATGPT_MEMORY_PROBE_PATH: "/tmp/chatgpt-memory-probe.jsonl",
      CHATGPT_MEMORY_PROBE_INTERVAL_MS: "250",
    },
    pid: 42,
    uptime: () => 12.5,
    memoryUsage: () => ({ rss: 100, heapTotal: 50, heapUsed: 25 }),
    getActiveResourcesInfo: () => ["PipeWrap", "PipeWrap", "Timeout"],
  };
  const app = {
    getAppMetrics: () => [{
      pid: 42,
      type: "Browser",
      memory: { workingSetSize: 100 },
      cpu: { percentCPUUsage: 99 },
    }],
    once: (event, listener) => listeners.set(event, listener),
  };

  vm.runInNewContext(memoryProbeRuntimeSource(), {
    clearInterval() {},
    console,
    Date,
    JSON,
    process,
    require(specifier) {
      if (specifier === "node:fs") {
        return {
          appendFileSync: (path, contents, options) => writes.push({ path, contents, options }),
          mkdirSync() {},
        };
      }
      if (specifier === "node:path") {
        return {
          dirname: () => "/tmp",
          resolve: (path) => path,
        };
      }
      if (specifier === "node:v8") {
        return {
          getHeapStatistics: () => ({ used_heap_size: 25 }),
          getHeapSpaceStatistics: () => [{ space_name: "old_space", space_used_size: 20 }],
        };
      }
      if (specifier === "electron") return { app };
      throw new Error(`unexpected require: ${specifier}`);
    },
    setInterval(listener, intervalMs) {
      timer.listener = listener;
      timer.intervalMs = intervalMs;
      timer.unref = () => {
        timer.unrefCalled = true;
      };
      return timer;
    },
  });

  assert.equal(writes.length, 1);
  assert.equal(timer.intervalMs, 1_000);
  assert.equal(timer.unrefCalled, true);
  assert.ok(listeners.has("before-quit"));

  const sample = JSON.parse(writes[0].contents);
  assert.equal(sample.reason, "startup");
  assert.deepEqual(sample.activeResources, { PipeWrap: 2, Timeout: 1 });
  assert.deepEqual(sample.appMetrics, [{
    pid: 42,
    type: "Browser",
    memory: { workingSetSize: 100 },
  }]);
  assert.equal(writes[0].options.mode, 0o600);
});
