import { offlineEnvironment } from "./environment.js";
import { run } from "./exec.js";

run(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", ...process.argv.slice(2)],
  offlineEnvironment(process.env),
);
