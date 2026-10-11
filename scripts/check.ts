import { readFileSync } from "node:fs";
import { offlineEnvironment } from "./environment.js";
import { run } from "./exec.js";

const expected = readFileSync(".nvmrc", "utf8").trim();
if (process.versions.node !== expected) throw new Error(`Use Node ${expected} (nvm use).`);
const env = offlineEnvironment(process.env);
const steps = [
  ["node_modules/@biomejs/biome/bin/biome", ["check", "--error-on-warnings", "."]],
  [process.execPath, ["node_modules/typescript/bin/tsc", "-p", "tsconfig.check.json"]],
  [process.execPath, ["node_modules/vitest/vitest.mjs", "run"]],
  [process.execPath, ["scripts/build.mjs"]],
  [process.execPath, ["--import", "tsx", "scripts/cli-smoke.ts"]],
  [process.execPath, ["--import", "tsx", "scripts/document-links.ts"]],
  [process.execPath, ["--import", "tsx", "scripts/okf-check.ts"]],
  [
    process.execPath,
    ["node_modules/@fission-ai/openspec/bin/openspec.js", "validate", "--all", "--strict"],
  ],
] as const;
for (const [command, args] of steps) run(command, [...args], env);
