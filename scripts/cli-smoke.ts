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
  ["mail:status", "private-option-marker"],
  ["mail:status"],
  ["mail:classify", "--max-jobs", "private-option-marker"],
  ["mail:classify"],
  ["brief:publish", "--max-new", "private-option-marker"],
  ["brief:publish", "--max-conversations", "21"],
  ["brief:publish", "--retro-review", "--retro-review"],
  ["brief:publish", "--retro-review", "private-option-marker"],
  ["brief:publish", "--retro-review", "--max-new", "0"],
  ["brief:publish"],
  ["mail:tasks", "preview", "--offset", "private-option-marker"],
  ["mail:tasks", "preview"],
  ["mail:tasks", "apply"],
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
  if (
    args[0] === "mail:tasks" &&
    (args.includes("--offset") || args[1] === "apply") &&
    !result.stderr.includes("mail:tasks preview")
  )
    throw new Error("Compiled reviewed task dispatch failed.");
}
console.log("Compiled CLI preview options and configuration failures: OK");

// Exercise compiled dispatch with DB-only configuration and a failing fake driver.
const status = spawnSync(
  process.execPath,
  [
    "--import",
    "./scripts/no-network.mjs",
    "--input-type=module",
    "--eval",
    `import pg from "pg";
   pg.Pool.prototype.connect = async () => { throw new Error("private-driver-marker"); };
   process.argv = [process.execPath, "dist/cli.js", "mail:status"];
   await import("./dist/cli.js");`,
  ],
  {
    env: { ...offlineEnvironment(process.env), DB_URL: "postgresql://fake:fake@127.0.0.1:1/fake" },
    encoding: "utf8",
  },
);
const report = JSON.parse(status.stdout);
if (
  status.status !== 1 ||
  status.stderr ||
  report.schemaState !== "unavailable" ||
  report.reason !== "database-unavailable" ||
  report.retrievals !== null ||
  report.providerCalls !== 0 ||
  status.stdout.includes("private-driver-marker")
)
  throw new Error("Compiled mail status failure handling failed.");
console.log("Compiled CLI DB-only mail status: OK");
