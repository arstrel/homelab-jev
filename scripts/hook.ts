import { readFileSync } from "node:fs";
import { offlineEnvironment } from "./environment.js";
import { run } from "./exec.js";
import { gate } from "./git-gate.js";

const mode = process.argv[2];
if (mode !== "commit" && mode !== "push") throw new Error("Expected commit or push gate");
try {
  gate(mode, process.cwd(), mode === "push" ? readFileSync(0, "utf8") : "", () => {
    const env = offlineEnvironment(process.env);
    run("npm", ["run", "check"], env);
    if (mode === "push") run("npm", ["run", "test:integration"], env);
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : "Git gate failed");
  process.exitCode = 1;
}
