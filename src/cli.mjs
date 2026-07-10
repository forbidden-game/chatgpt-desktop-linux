#!/usr/bin/env node

import { inspectDmg } from "./upstream.mjs";
import { assembleApp } from "./assemble.mjs";
import { packageDeb } from "./package-deb.mjs";

function usage() {
  console.error("Usage: node src/cli.mjs <inspect|app|build|package> <path>");
}

const [command, input, ...rest] = process.argv.slice(2);
if (!["inspect", "app", "build", "package"].includes(command) || !input || rest.length > 0) {
  usage();
  process.exitCode = 2;
} else {
  try {
    let result;
    if (command === "inspect") result = await inspectDmg(input);
    if (command === "app") result = await assembleApp(input);
    if (command === "package") result = await packageDeb(input);
    if (command === "build") {
      const app = await assembleApp(input);
      result = { ...app, package: await packageDeb(app.appDir) };
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
