import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { offlineEnvironment } from "./environment.js";
import { testDatabaseUrl } from "./test-database.js";

export const postgresImage =
  "postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24";
const name = `jev-tests-${randomUUID()}`;
const env = offlineEnvironment(process.env);
let started = false;
let child: ReturnType<typeof spawn> | undefined;
const docker = (...args: string[]) =>
  execFileSync("docker", args, { env, encoding: "utf8", timeout: 120000 }).trim();
const cleanup = () => {
  if (started) {
    started = false;
    docker("rm", "-f", name);
  }
};
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    child?.kill(signal);
    cleanup();
    process.exit(1);
  });
try {
  if (process.env.TEST_DATABASE_URL) {
    // CI may supply only explicit disposable settings; reject operational contamination.
    env.TEST_DATABASE_URL = testDatabaseUrl(process.env);
  } else {
    docker(
      "run",
      "--detach",
      "--name",
      name,
      "--label",
      "jev.test=true",
      "--publish",
      "127.0.0.1::5432",
      "--env",
      "POSTGRES_USER=jev_test",
      "--env",
      "POSTGRES_PASSWORD=jev_test",
      "--env",
      "POSTGRES_DB=jev_test",
      postgresImage,
    );
    started = true;
    const binding = docker("port", name, "5432/tcp");
    const port = binding.split(":").at(-1);
    env.TEST_DATABASE_URL = `postgresql://jev_test:jev_test@127.0.0.1:${port}/jev_test`;
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        docker("exec", name, "pg_isready", "-U", "jev_test", "-d", "jev_test");
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    if (!ready) throw new Error("Disposable PostgreSQL did not become ready");
  }
  env.JEV_TEST_DATABASE = "disposable";
  testDatabaseUrl(env);
  const code = await new Promise<number>((resolve, reject) => {
    child = spawn(
      process.execPath,
      ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.ts"],
      { env, stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
  process.exitCode = code;
} finally {
  cleanup();
}
