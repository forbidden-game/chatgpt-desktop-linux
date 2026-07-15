const MARKER = "/* chatgpt-linux: x11-window-suspension */";
const MAIN_STARTUP_EXPORT = "exports.runMainAppStartup=";

export function x11WindowSuspensionRuntimeSource() {
  return String.raw`${MARKER}
(() => {
  const usesX11 = process.platform === "linux" && (
    process.env.XDG_SESSION_TYPE === "x11" ||
    process.argv.some((argument) => argument === "--ozone-platform=x11")
  );
  if (!usesX11 || process.env.CHATGPT_X11_WINDOW_SUSPENSION === "0") return;

  const { app, BrowserWindow } = require("electron");
  const overlapThreshold = 0.95;

  const canSuspend = (window) => (
    window != null &&
    !window.isDestroyed() &&
    window.getParentWindow() == null &&
    !window.isMinimized() &&
    window.isMaximized() &&
    window.isMinimizable()
  );

  const mostlyOverlaps = (first, second) => {
    const a = first.getBounds();
    const b = second.getBounds();
    const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const smallerArea = Math.min(a.width * a.height, b.width * b.height);
    return smallerArea > 0 && width * height / smallerArea >= overlapThreshold;
  };

  const suspendCoveredWindows = (focusedWindow) => {
    if (!focusedWindow.isFocused() || !canSuspend(focusedWindow)) return;
    for (const window of BrowserWindow.getAllWindows()) {
      if (window !== focusedWindow && canSuspend(window) && mostlyOverlaps(focusedWindow, window)) {
        window.minimize();
      }
    }
  };

  const scheduleSuspension = (window) => {
    setImmediate(() => suspendCoveredWindows(window));
  };

  app.on("browser-window-focus", (_event, window) => scheduleSuspension(window));
  app.on("browser-window-created", (_event, window) => {
    window.on("maximize", () => scheduleSuspension(window));
  });
})();
`;
}

export function applyX11WindowSuspensionPatch(source) {
  if (source.includes(MARKER)) return source;
  const first = source.indexOf(MAIN_STARTUP_EXPORT);
  if (first < 0 || source.indexOf(MAIN_STARTUP_EXPORT, first + MAIN_STARTUP_EXPORT.length) >= 0) {
    throw new Error("unsupported main process source for X11 window suspension");
  }
  return `${x11WindowSuspensionRuntimeSource()}${source}`;
}
