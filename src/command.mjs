import { spawn } from "node:child_process";

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    const stdout = [];
    const stderr = [];
    child.stdout?.on("data", (chunk) => stdout.push(chunk));
    child.stderr?.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve({
          stderr: Buffer.concat(stderr).toString("utf8"),
          stdout: Buffer.concat(stdout).toString("utf8"),
        });
        return;
      }
      const detail = Buffer.concat(stderr).toString("utf8").trim();
      reject(new Error(
        `${command} failed (${signal ? `signal ${signal}` : `exit ${code}`})` +
        (detail ? `: ${detail}` : ""),
      ));
    });
  });
}
