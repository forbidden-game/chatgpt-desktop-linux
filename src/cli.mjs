#!/usr/bin/env node

import { inspectDmg } from "./upstream.mjs";

function usage() {
  console.error("Usage: node src/cli.mjs inspect /path/to/ChatGPT.dmg");
}

const [command, input, ...rest] = process.argv.slice(2);
if (command !== "inspect" || !input || rest.length > 0) {
  usage();
  process.exitCode = 2;
} else {
  try {
    console.log(JSON.stringify(await inspectDmg(input), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
