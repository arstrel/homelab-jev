import { ConfigurationError, type Environment } from "../src/config.js";

export function testDatabaseUrl(env: Environment): string {
  if (
    Object.keys(env).some(
      (key) => /^(DB_|JEV_API_KEY$|GOOGLE_|TODOIST_|TYPESAFE_)/.test(key) && env[key] !== undefined,
    )
  )
    throw new ConfigurationError(["test environment contains operational settings"]);
  try {
    const url = new URL(env.TEST_DATABASE_URL ?? "");
    if (
      env.JEV_TEST_DATABASE !== "disposable" ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "::1", "[::1]"].includes(url.hostname) ||
      url.pathname !== "/jev_test" ||
      url.username !== "jev_test" ||
      url.password !== "jev_test" ||
      !url.port ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.href;
  } catch {
    throw new ConfigurationError([
      "TEST_DATABASE_URL must be an explicitly disposable local jev_test database",
    ]);
  }
}
