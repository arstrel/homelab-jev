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

for (const args of [
  ["mail:preview", "--days", "private-option-marker"],
  ["mail:preview"],
  ["mail:ingest", "--days", "private-option-marker"],
  ["mail:ingest"],
  ["mail:sync", "--days", "private-option-marker"],
  ["mail:sync"],
  ["status", "unexpected"],
]) {
  const result = spawnSync(
    process.execPath,
    ["--import", "./scripts/no-network.mjs", "dist/cli.js", ...args],
    { env: offlineEnvironment(process.env), encoding: "utf8" },
  );
  if (
    result.status !== 1 ||
    result.stdout ||
    !result.stderr.trim() ||
    result.stderr.includes("private-option-marker")
  )
    throw new Error("Compiled CLI invalid/configuration handling failed.");
}
console.log("Compiled CLI preview options and configuration failures: OK");
