import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { offlineEnvironment } from "./environment.js";
import { guard } from "./git-gate.js";

// Explicit, slower evidence command. It never edits the developer checkout.
const source = process.cwd();
const cwd = mkdtempSync(join(tmpdir(), "jev-clean-foundation-"));
const env = { ...offlineEnvironment(process.env), HUSKY: "0" };
const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
try {
  const files = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: source, encoding: "utf8" },
  )
    .split("\0")
    .filter(Boolean);
  for (const path of new Set(files)) {
    if (/^\.env(?:$|\.)/.test(path) && path !== ".env.example")
      throw new Error("Refusing to copy a secret environment file");
    if (!existsSync(join(source, path))) continue;
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    cpSync(join(source, path), join(cwd, path));
  }
  const installed = spawnSync("npm", ["ci", "--offline", "--cache", "/private/tmp/jev-npm-cache"], {
    cwd,
    env,
    encoding: "utf8",
  });
  if (installed.status !== 0) throw new Error(`Clean npm ci failed: ${installed.stderr}`);
  git("init", "-b", "main");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "core.hooksPath", "/dev/null");
  git("add", ".");
  git("commit", "-m", "clean fixture");
  console.log("Clean locked installation without .env: passed");
  const check = (label: string, succeeds: boolean, pattern?: RegExp) => {
    git("add", "-A");
    const before = guard("commit", cwd);
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/check.ts"], {
      cwd,
      env,
      encoding: "utf8",
      timeout: 90000,
    });
    if (guard("commit", cwd) !== before) throw new Error(`Gate mutated inputs in ${label}`);
    if (
      (result.status === 0) !== succeeds ||
      (pattern && !pattern.test(`${result.stdout}\n${result.stderr}`))
    )
      throw new Error(`${label} had unexpected result:\n${result.stdout}\n${result.stderr}`);
    console.log(`${label}: passed; validation inputs unchanged`);
  };
  check("Clean checkout canonical check", true);
  const fault = join(cwd, "src/controlled-fault.ts");
  writeFileSync(fault, "debugger;\n");
  check("Lint regression rejected", false, /noDebugger/);
  rmSync(fault);
  writeFileSync(fault, 'export const controlledTypeFailure: number = "wrong";\n');
  check("Type regression rejected", false, /TS2322/);
  rmSync(fault);
  const test = join(cwd, "tests/unit/controlled.test.ts");
  writeFileSync(
    test,
    'import { expect, it } from "vitest";\n\nit("controlled failure", () => {\n  expect(true).toBe(false);\n});\n',
  );
  check("Test regression rejected", false, /AssertionError/);
  rmSync(test);
  const spec = join(
    cwd,
    "openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md",
  );
  const original = readFileSync(spec, "utf8");
  writeFileSync(spec, original.replace(/^#### Scenario:.*\n/gm, ""));
  check("Specification regression rejected", false, /scenario|invalid/i);
  writeFileSync(spec, original);
  console.log("Foundation failure-injection evidence complete");
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
