import { spawnSync } from "node:child_process";
import { offlineEnvironment } from "./environment.js";

for (const argument of ["--help", "--version"]) {
  const result = spawnSync(
    process.execPath,
    ["--import", "./scripts/no-network.mjs", "dist/cli.js", argument],
    { env: offlineEnvironment(process.env), encoding: "utf8" },
  );
  if (result.status !== 0 || !result.stdout.trim())
    throw new Error(`Compiled CLI ${argument} failed: ${result.stderr}`);
  console.log(`Compiled CLI ${argument}: OK`);
}
