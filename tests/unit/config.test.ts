import { describe, expect, it } from "vitest";
import { offlineEnvironment } from "../../scripts/environment.js";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { status } from "../../src/application/status.js";
import { databaseUrl, diagnostic, workerConfiguration } from "../../src/config.js";
import { ids, instant } from "../fixtures/runtime.js";

const parts = {
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "fake",
  DB_USER: "test@user",
  DB_PASSWORD: "dummy:p@ss",
  JEV_API_KEY: "fake-key",
};
describe("explicit configuration", () => {
  it("forbids loading a production environment file", () => {
    expect(() => process.loadEnvFile(".env")).toThrow(/forbidden/);
  });
  it("prefers DB_URL without reading invalid fallback fields", () => {
    expect(
      databaseUrl({ ...parts, DB_PORT: "invalid", DB_URL: "postgresql://u:p@localhost:1234/demo" }),
    ).toBe("postgresql://u:p@localhost:1234/demo");
  });
  it("encodes fallback credentials and validates worker key", () => {
    const config = workerConfiguration(parts);
    const url = new URL(config.databaseUrl);
    expect(decodeURIComponent(url.password)).toBe(parts.DB_PASSWORD);
    expect(decodeURIComponent(url.username)).toBe(parts.DB_USER);
    expect(config.jevApiKey).toBe("fake-key");
  });
  it.each([
    {},
    { ...parts, DB_PORT: "70000" },
    { ...parts, DB_URL: "https://fake-key:password@localhost" },
    { ...parts, DB_URL: "" },
    { ...parts, JEV_API_KEY: "" },
    { ...parts, DB_HOST: "localhost/evil" },
  ])("rejects invalid settings with redacted diagnostics", (env) => {
    try {
      workerConfiguration(env);
      throw new Error("Expected rejection");
    } catch (error) {
      expect(diagnostic(error)).toMatch(/Invalid or missing/);
      expect(diagnostic(error)).not.toContain("fake-key");
      expect(diagnostic(error)).not.toContain(parts.DB_PASSWORD);
    }
  });
  it("does not forward arbitrary exception text or fields", () => {
    expect(diagnostic(new Error("password=fake-key"))).not.toContain("fake-key");
    expect(diagnostic({ token: "fake-key" })).not.toContain("fake-key");
  });
  it("strips shell secrets before validation commands", () => {
    expect(offlineEnvironment({ ...parts, GH_TOKEN: "fake", PATH: "bin", TZ: "other" })).toEqual({
      PATH: "bin",
      TZ: "UTC",
      OPENSPEC_TELEMETRY: "0",
      DO_NOT_TRACK: "1",
    });
  });
});
it("uses an injected clock for application status", async () => {
  expect(
    await status(
      { status: async () => ({ checkpoints: 0, pendingJobs: 2, writeIntents: 1 }) },
      { now: () => instant, id: () => ids.job },
    ),
  ).toEqual({ checkedAt: instant.toISOString(), checkpoints: 0, pendingJobs: 2, writeIntents: 1 });
});
describe("test database isolation", () => {
  const env = {
    TEST_DATABASE_URL: "postgresql://jev_test:jev_test@127.0.0.1:5432/jev_test",
    JEV_TEST_DATABASE: "disposable",
  };
  it("accepts an explicit dummy local database", () =>
    expect(testDatabaseUrl(env)).toBe(env.TEST_DATABASE_URL));
  it.each([
    { ...env, DB_URL: "fake" },
    { ...env, DB_USER: "real" },
    { ...env, JEV_API_KEY: "fake" },
    { ...env, JEV_TEST_DATABASE: "" },
    { ...env, TEST_DATABASE_URL: "postgresql://prod:password@example.com/main" },
    { ...env, TEST_DATABASE_URL: `${env.TEST_DATABASE_URL}?options=evil` },
  ])("refuses operational settings and ambiguous targets", (input) =>
    expect(() => testDatabaseUrl(input)).toThrow(/configuration/),
  );
});
