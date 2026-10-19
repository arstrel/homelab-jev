import { afterEach, expect, it, vi } from "vitest";
import { ingestionPolicyVersion, ingestMail } from "../../src/application/ingest-mail.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import type { EvidenceStore, MailReader } from "../../src/application/ports.js";
import { runMailIngest } from "../../src/cli-mail.js";
import { mailInstant, threadRead } from "../fixtures/mail.js";

const clock = {
  now: () => new Date(mailInstant),
  id: () => "10000000-0000-4000-8000-000000000001",
};
const options = { days: 30, maxThreads: 20 };
const env = {
  DB_URL: "postgresql://fake:fake@127.0.0.1:5432/fake",
  GOOGLE_CLIENT_ID: "fake-client",
  GOOGLE_CLIENT_SECRET: "fake-secret",
  GOOGLE_REFRESH_TOKEN: "fake-refresh",
};
const budgets: MailBudget[] = [];
const budget = (signal?: AbortSignal) => {
  const value = new MailBudget({}, signal);
  budgets.push(value);
  return value;
};
afterEach(() => {
  for (const value of budgets.splice(0)) value.close();
});
function reader(ids = ["t-boiler"], more = false): MailReader {
  return {
    listThreads: vi.fn(async () => ({ ids, ...(more ? { nextToken: "more" } : {}) })),
    readThreadEvidence: vi.fn(async (id) => threadRead(id)),
  };
}
function store(): EvidenceStore {
  return {
    persistEvidence: vi.fn(async (records) => ({
      newVersions: records.length,
      newJobs: records.length,
      boundLegacyJobs: 0,
    })),
    evidenceForJob: vi.fn(async () => ({ status: "missing-job" as const })),
  };
}
it("persists only complete eligible evidence and reports mixed coverage honestly", async () => {
  const mail = reader(["complete", "partial", "old"]);
  vi.mocked(mail.readThreadEvidence).mockImplementation(async (id) => {
    const read = threadRead(id);
    if (id === "old") {
      read.evidence.messages.splice(1);
      read.observation.messages.splice(1);
    }
    if (id === "partial") read.evidence.coverage.messageBodies = "partial";
    return read;
  });
  const ledger = store();
  const report = await ingestMail(options, { mail, store: ledger, clock, budget: budget() });
  expect(report).toMatchObject({
    exitCode: 1,
    eligibleThreads: 2,
    partialThreads: 1,
    skippedThreads: 1,
    downstreamWrites: 0,
    checkpointAdvanced: false,
    persistence: { status: "committed", newVersions: 1, newJobs: 1 },
  });
  expect(ledger.persistEvidence).toHaveBeenCalledTimes(1);
  const [batch] = vi.mocked(ledger.persistEvidence).mock.calls[0] ?? [];
  expect(batch).toHaveLength(1);
  expect(batch?.[0]?.evidence.source.threadId).toBe("complete");
  expect(batch?.[0]?.policyVersion).toBe(ingestionPolicyVersion);
});
it.each(["SPAM", "TRASH"])("excludes mixed %s conversations before persistence", async (label) => {
  const mail = reader();
  const read = threadRead();
  read.observation.messages[0]?.labels.push(label);
  vi.mocked(mail.readThreadEvidence).mockResolvedValue(read);
  const ledger = store();
  const report = await ingestMail(options, { mail, store: ledger, clock, budget: budget() });
  expect(report).toMatchObject({
    exitCode: 0,
    eligibleThreads: 0,
    skippedThreads: 1,
    persistence: { status: "not-needed", newVersions: 0, newJobs: 0 },
  });
  expect(ledger.persistEvidence).not.toHaveBeenCalled();
});
it("saves a limited sample without claiming discovery completeness", async () => {
  const report = await ingestMail(
    { days: 30, maxThreads: 1 },
    { mail: reader(["t-boiler"], true), store: store(), clock, budget: budget() },
  );
  expect(report).toMatchObject({
    exitCode: 2,
    discoveryComplete: false,
    reasons: ["thread-limit"],
    persistence: { newVersions: 1 },
  });
});
it("reports zero committed counters and fixed errors when the transaction fails", async () => {
  const ledger = store();
  vi.mocked(ledger.persistEvidence).mockRejectedValue(
    new Error("fake-secret private-body me@example.com"),
  );
  const report = await ingestMail(options, {
    mail: reader(),
    store: ledger,
    clock,
    budget: budget(),
  });
  expect(report).toMatchObject({
    exitCode: 1,
    reasons: ["persistence-error"],
    persistence: { status: "failed", newVersions: 0, newJobs: 0, boundLegacyJobs: 0 },
  });
  for (const marker of [
    "fake-secret",
    "private-body",
    "example.com",
    "Boiler",
    "t-boiler",
    "Please send",
    "sha256",
  ])
    expect(JSON.stringify(report)).not.toContain(marker);
});
it("does not open a persistence transaction for empty or wholly partial evidence", async () => {
  for (const empty of [true, false]) {
    const mail = reader(empty ? [] : ["partial"]);
    const read = threadRead();
    read.evidence.coverage.messageBodies = "partial";
    vi.mocked(mail.readThreadEvidence).mockResolvedValue(read);
    const ledger = store();
    const report = await ingestMail(options, { mail, store: ledger, clock, budget: budget() });
    expect(ledger.persistEvidence).not.toHaveBeenCalled();
    expect(report.persistence.status).toBe("not-needed");
    expect(report.exitCode).toBe(empty ? 0 : 1);
  }
});
it("cancellation after retrieval prevents persistence", async () => {
  const controller = new AbortController();
  const mail = reader();
  vi.mocked(mail.readThreadEvidence).mockImplementation(async () => {
    controller.abort();
    return threadRead();
  });
  const ledger = store();
  const report = await ingestMail(options, {
    mail,
    store: ledger,
    clock,
    budget: budget(controller.signal),
  });
  expect(ledger.persistEvidence).not.toHaveBeenCalled();
  expect(report).toMatchObject({
    exitCode: 1,
    persistence: { status: "cancelled" },
    reasons: ["cancelled"],
  });
});
it("validates all options and Google/database configuration before constructing adapters", async () => {
  const database = vi.fn();
  const mail = vi.fn();
  for (const [args, environment] of [
    [["--days", "private-value"], env],
    [["--unknown", "private-value"], env],
    [[], {}],
    [[], { ...env, DB_URL: "private-invalid-url" }],
    [[], { DB_URL: env.DB_URL }],
  ] as const)
    await expect(runMailIngest(args, environment, { database, reader: mail })).rejects.toThrow();
  expect(database).not.toHaveBeenCalled();
  expect(mail).not.toHaveBeenCalled();
});
it("composes Google and DB only, closes the pool after success or persistence failure", async () => {
  for (const fail of [false, true]) {
    const ledger = store();
    if (fail) vi.mocked(ledger.persistEvidence).mockRejectedValue(new Error("private DB failure"));
    const close = vi.fn(async () => {});
    const database = vi.fn(() => ({ store: ledger, close }));
    const report = await runMailIngest([], env, { clock, reader: () => reader(), database });
    expect(database).toHaveBeenCalledWith(env.DB_URL);
    expect(close).toHaveBeenCalledTimes(1);
    expect(report.exitCode).toBe(fail ? 1 : 0);
    expect(JSON.stringify(report)).not.toContain("private");
  }
});
it("closes the pool if reader initialization fails and opens nothing for an already cancelled command", async () => {
  const close = vi.fn(async () => {});
  const database = vi.fn(() => ({ store: store(), close }));
  await expect(
    runMailIngest([], env, {
      database,
      reader: () => {
        throw new Error("private-provider");
      },
    }),
  ).rejects.toThrow();
  expect(close).toHaveBeenCalledTimes(1);
  database.mockClear();
  const controller = new AbortController();
  controller.abort();
  await expect(runMailIngest([], env, { database, signal: controller.signal })).rejects.toThrow(
    "cancelled",
  );
  expect(database).not.toHaveBeenCalled();
});
