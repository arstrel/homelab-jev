import { expect, it, vi } from "vitest";
import { mailStatus } from "../../src/application/mail-status.js";
import { runMailStatus } from "../../src/cli-mail-status.js";
import type { MailStatusSnapshot } from "../../src/domain/mail-status.js";
import { unavailableMeasurements } from "../../src/domain/mail-status.js";
import { mailInstant } from "../fixtures/mail.js";

const clock = { now: () => new Date(mailInstant) };
const env = { DB_URL: "postgresql://fake:fake@localhost:5432/fake" };
function snapshot(): MailStatusSnapshot {
  return {
    schemaState: "ready",
    phase: "uninitialized",
    window: null,
    discoveryCheckedAt: null,
    evidenceSyncedAt: null,
    recovery: null,
    retrievals: { pending: 0, due: 0, retrying: 0, nextRetryAt: null, failures: {} },
    classification: { pendingJobs: 3, unboundPendingJobs: 1 },
  };
}
it("uses DB configuration only, strips unexpected properties and closes the pool", async () => {
  const read = vi.fn(async () =>
    Object.assign(snapshot(), { secret: "private-value", providerCalls: 42 }),
  );
  const close = vi.fn(async () => {});
  const database = vi.fn(() => ({ reader: { read }, close }));
  const report = await runMailStatus([], env, { clock, database });
  expect(database).toHaveBeenCalledWith(env.DB_URL);
  expect(read).toHaveBeenCalledWith(mailInstant);
  expect(report).toMatchObject({
    checkedAt: mailInstant.toISOString(),
    schemaState: "ready",
    phase: "uninitialized",
    evidenceSyncedAt: null,
    readOnly: true,
    providerCalls: 0,
    classification: { pendingJobs: 3, unboundPendingJobs: 1 },
    exitCode: 0,
  });
  expect(JSON.stringify(report)).not.toMatch(/private-value|secret/);
  expect(close).toHaveBeenCalledTimes(1);
});
it("rejects bad arguments/configuration before adapter creation without exposing their values", async () => {
  const database = vi.fn();
  await expect(runMailStatus(["private-argument"], env, { database })).rejects.toThrow(
    "mail:status options",
  );
  await expect(runMailStatus([], {}, { database })).rejects.toThrow("DB_");
  await expect(runMailStatus([], { DB_URL: "private-url" }, { database })).rejects.not.toThrow(
    "private-url",
  );
  expect(database).not.toHaveBeenCalled();
});
it("returns null measurements and fixed diagnostics after driver errors and closes resources", async () => {
  const close = vi.fn(async () => {});
  const report = await runMailStatus([], env, {
    clock,
    database: () => ({
      reader: {
        read: async () => {
          throw new Error("private-db-password");
        },
      },
      close,
    }),
  });
  expect(report).toMatchObject({
    schemaState: "unavailable",
    phase: null,
    retrievals: null,
    classification: null,
    reason: "database-unavailable",
    exitCode: 1,
  });
  expect(JSON.stringify(report)).not.toContain("private-db-password");
  expect(close).toHaveBeenCalledTimes(1);
});
it("distinguishes migration readiness from success and never fabricates zero counts", async () => {
  for (const [state, exitCode] of [
    ["migration-required", 2],
    ["incompatible", 1],
  ] as const) {
    const report = await mailStatus({ read: async () => unavailableMeasurements(state) }, clock);
    expect(report).toMatchObject({
      schemaState: state,
      exitCode,
      retrievals: null,
      recovery: null,
      discoveryCheckedAt: null,
      evidenceSyncedAt: null,
    });
  }
});
it("rejects malformed snapshots instead of echoing arbitrary database phase or failure strings", async () => {
  for (const invalid of [
    { ...snapshot(), phase: "private-phase" },
    {
      ...snapshot(),
      retrievals: {
        pending: 1,
        due: 1,
        retrying: 1,
        nextRetryAt: null,
        failures: { "private-failure": 1 },
      },
    },
    { ...snapshot(), schemaState: "migration-required" },
  ]) {
    const report = await mailStatus({ read: async () => invalid as MailStatusSnapshot }, clock);
    expect(report).toMatchObject({ schemaState: "unavailable", retrievals: null, exitCode: 1 });
    expect(JSON.stringify(report)).not.toContain("private-");
  }
});
