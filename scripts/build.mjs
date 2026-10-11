import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
process.exitCode =
  spawnSync(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"], {
    stdio: "inherit",
  }).status ?? 1;
