import { spawnSync } from "node:child_process";

export function run(command: string, args: string[], env: NodeJS.ProcessEnv, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`${command} failed with exit ${result.status ?? "unavailable"}`);
}
