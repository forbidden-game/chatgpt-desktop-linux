const MARKER = "/* chatgpt-linux: opt-in-memory-probe */";
const MAIN_STARTUP_EXPORT = "exports.runMainAppStartup=";

export function memoryProbeRuntimeSource() {
  return String.raw`${MARKER}
(() => {
  const configuredPath = process.env.CHATGPT_MEMORY_PROBE_PATH?.trim();
  if (!configuredPath) return;

  const fs = require("node:fs");
  const path = require("node:path");
  const v8 = require("node:v8");
  const { app } = require("electron");
  const outputPath = path.resolve(configuredPath);
  const requestedIntervalMs = Number.parseInt(
    process.env.CHATGPT_MEMORY_PROBE_INTERVAL_MS ?? "5000",
    10,
  );
  const intervalMs = Number.isFinite(requestedIntervalMs)
    ? Math.min(60_000, Math.max(1_000, requestedIntervalMs))
    : 5_000;
  let timer = null;
  let stopped = false;

  const activeResourceCounts = () => {
    const counts = Object.create(null);
    for (const type of process.getActiveResourcesInfo?.() ?? []) {
      counts[type] = (counts[type] ?? 0) + 1;
    }
    return counts;
  };

  const appMetrics = () => app.getAppMetrics().map((metric) => ({
    pid: metric.pid,
    type: metric.type,
    memory: metric.memory,
  }));

  const stop = (error) => {
    if (stopped) return;
    stopped = true;
    if (timer != null) clearInterval(timer);
    console.error("ChatGPT Linux memory probe stopped", error);
  };

  const sample = (reason = "interval") => {
    if (stopped) return;
    try {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.appendFileSync(outputPath, JSON.stringify({
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        reason,
        pid: process.pid,
        uptimeSeconds: process.uptime(),
        processMemory: process.memoryUsage(),
        heap: v8.getHeapStatistics(),
        heapSpaces: v8.getHeapSpaceStatistics(),
        activeResources: activeResourceCounts(),
        appMetrics: appMetrics(),
      }) + "\n", { encoding: "utf8", mode: 0o600 });
    } catch (error) {
      stop(error);
    }
  };

  sample("startup");
  if (!stopped) {
    timer = setInterval(sample, intervalMs);
    timer.unref();
    app.once("before-quit", () => {
      sample("before-quit");
      if (timer != null) clearInterval(timer);
    });
  }
})();
`;
}

export function applyOptInMemoryProbePatch(source) {
  if (source.includes(MARKER)) return source;
  const first = source.indexOf(MAIN_STARTUP_EXPORT);
  if (first < 0 || source.indexOf(MAIN_STARTUP_EXPORT, first + MAIN_STARTUP_EXPORT.length) >= 0) {
    throw new Error("unsupported main process source for memory probe");
  }
  return `${memoryProbeRuntimeSource()}${source}`;
}
