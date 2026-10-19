import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { MailBudget } from "../../src/application/mail-budget.js";
import type { MailSyncStore } from "../../src/application/ports.js";
import { syncMail } from "../../src/application/sync-mail.js";
import { mailSyncOptions, runMailSync } from "../../src/cli-mail-sync.js";
import { MailReadError } from "../../src/domain/mail-evidence.js";
import { mailInstant, threadRead } from "../fixtures/mail.js";
import { syncState } from "../fixtures/sync.js";
import { syncHarness } from "../fixtures/sync-session.js";

const budgets: MailBudget[] = [];
const clock = { now: () => new Date(mailInstant), id: randomUUID };
const options = { maxPages: 5, maxThreads: 20 };
const env = {
  DB_URL: "postgresql://fake:fake@127.0.0.1:5432/fake",
  GOOGLE_CLIENT_ID: "fake",
  GOOGLE_CLIENT_SECRET: "fake",
  GOOGLE_REFRESH_TOKEN: "fake",
};
function budget(signal?: AbortSignal) {
  const b = new MailBudget({}, signal);
  budgets.push(b);
  return b;
}
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
it("bootstraps before history and reports complete observation without source identifiers", async () => {
  const h = syncHarness();
  const report = await syncMail(options, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({
    phase: "history",
    pagesCommitted: 2,
    discoveryCaughtUp: true,
    evidenceComplete: true,
    exitCode: 0,
    downstreamWrites: 0,
  });
  expect(h.mail.currentHistoryId).toHaveBeenCalledTimes(1);
  expect(h.mail.listHistory).toHaveBeenCalledWith("10", undefined);
  expect(h.mail.listThreads).toHaveBeenCalledWith("after:1789128000 before:1791720001", undefined);
  expect(report.evidenceSyncedAt).toBe(mailInstant.toISOString());
});
it("reports bounded bootstrap and preserves its continuation without claiming freshness", async () => {
  const h = syncHarness();
  vi.mocked(h.mail.listThreads).mockResolvedValue({ ids: [], nextToken: "private-page-token" });
  const report = await syncMail({ ...options, maxPages: 1 }, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({
    phase: "bootstrap",
    discoveryCaughtUp: false,
    evidenceSyncedAt: null,
    exitCode: 2,
    reasons: ["page-limit"],
  });
  expect((await h.session.state())?.pageToken).toBe("private-page-token");
  expect(JSON.stringify(report)).not.toContain("private-page-token");
});
it("detects durable token cycles and regressing anchors without committing the failed page", async () => {
  const state = { ...syncState(), pageToken: "same", seenTokens: ["same"] };
  const h = syncHarness(state);
  vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: [], historyId: "20", nextToken: "same" });
  expect(await syncMail(options, { ...h, clock, budget: budget() })).toMatchObject({
    reasons: ["pagination-stalled"],
    exitCode: 1,
  });
  expect(h.session.savePage).not.toHaveBeenCalled();
  vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: [], historyId: "9" });
  expect(await syncMail(options, { ...h, clock, budget: budget() })).toMatchObject({
    reasons: ["invalid-data"],
    exitCode: 1,
  });
});
it("rolls discovery failure into a fixed report and never prints a SQL exception", async () => {
  const h = syncHarness(syncState());
  vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: ["private-thread"], historyId: "20" });
  vi.mocked(h.session.savePage).mockRejectedValue(new Error("private-sql-password"));
  const report = await syncMail(options, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({ pagesCommitted: 0, reasons: ["persistence-error"], exitCode: 1 });
  expect(h.mail.readThreadEvidence).not.toHaveBeenCalled();
  expect(JSON.stringify(report)).not.toMatch(/private-thread|private-sql-password/);
});
it("persists provider failures for backoff without relying on new discovery", async () => {
  const h = syncHarness(syncState());
  vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: ["t-boiler"], historyId: "20" });
  vi.mocked(h.mail.readThreadEvidence).mockRejectedValue(new Error("private-provider-body"));
  const report = await syncMail(options, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({
    pendingRetrievals: 1,
    retryingRetrievals: 1,
    evidenceComplete: false,
    exitCode: 1,
  });
  expect(vi.mocked(h.session.retry).mock.calls[0]?.[2]).toEqual(
    new Date(mailInstant.getTime() + 300_000),
  );
  expect(JSON.stringify(report)).not.toContain("private-provider-body");
});
it("acknowledges missing, Spam/Trash and draft-only threads without new evidence", async () => {
  const h = syncHarness(syncState());
  vi.mocked(h.mail.listHistory).mockResolvedValue({
    ids: ["gone", "spam", "draft"],
    historyId: "20",
  });
  vi.mocked(h.mail.readThreadEvidence).mockImplementation(async (id) => {
    if (id === "gone") throw new MailReadError("missing-thread");
    const read = threadRead(id);
    if (id === "spam") for (const m of read.observation.messages) m.labels = ["SPAM"];
    if (id === "draft") {
      read.evidence.messages = [];
      read.observation.messages = [];
    }
    return read;
  });
  expect(await syncMail(options, { ...h, clock, budget: budget() })).toMatchObject({
    acknowledgedThreads: 3,
    missingThreads: 1,
    excludedThreads: 2,
    newVersions: 0,
    newJobs: 0,
    exitCode: 0,
  });
  for (const call of vi.mocked(h.session.acknowledge).mock.calls) expect(call[1]).toBeUndefined();
});
it("keeps older changed history context eligible but excludes recent-draft-only bootstrap selections", async () => {
  for (const phase of ["bootstrap", "history"] as const) {
    const h = syncHarness(syncState(phase));
    const read = threadRead();
    read.evidence.messages.splice(1);
    read.observation.messages.splice(1);
    vi.mocked(h.mail.readThreadEvidence).mockResolvedValue(read);
    if (phase === "bootstrap")
      vi.mocked(h.mail.listThreads).mockResolvedValue({ ids: ["t-boiler"] });
    else vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: ["t-boiler"], historyId: "20" });
    const report = await syncMail(options, { ...h, clock, budget: budget() });
    expect(report.newJobs).toBe(phase === "bootstrap" ? 0 : 1);
  }
});
it("cancellation after a read leaves retrieval work pending and never acknowledges it", async () => {
  const h = syncHarness(syncState());
  const controller = new AbortController();
  vi.mocked(h.mail.listHistory).mockResolvedValue({ ids: ["t-boiler"], historyId: "20" });
  vi.mocked(h.mail.readThreadEvidence).mockImplementation(async () => {
    controller.abort();
    return threadRead();
  });
  const report = await syncMail(options, { ...h, clock, budget: budget(controller.signal) });
  expect(h.session.acknowledge).not.toHaveBeenCalled();
  expect(report).toMatchObject({ pendingRetrievals: 1, evidenceSyncedAt: null, exitCode: 1 });
  expect(report.reasons).toContain("cancelled");
});
it("validates options and configuration before creating adapters", async () => {
  expect(mailSyncOptions([])).toEqual(options);
  const database = vi.fn(),
    reader = vi.fn();
  for (const args of [
    ["--max-pages", "0"],
    ["--max-pages", "21"],
    ["--days", "private"],
    ["--days"],
    ["--days", "1", "--days", "2"],
    ["--unknown", "private"],
  ])
    await expect(runMailSync(args, env, { database, reader })).rejects.toThrow();
  await expect(runMailSync([], {}, { database, reader })).rejects.toThrow();
  await expect(runMailSync([], { DB_URL: env.DB_URL }, { database, reader })).rejects.toThrow();
  expect(database).not.toHaveBeenCalled();
  expect(reader).not.toHaveBeenCalled();
});
it("skips an overlapping command without a provider and closes the pool", async () => {
  const close = vi.fn(async () => {}),
    reader = vi.fn();
  const store: MailSyncStore = { exclusive: async () => undefined };
  const report = await runMailSync([], env, { database: () => ({ store, close }), reader });
  expect(report).toMatchObject({ phase: "skipped", reasons: ["overlapping-run"], exitCode: 0 });
  expect(reader).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
});
it("uses Google/DB only, closes resources after reader failures and honors pre-cancellation", async () => {
  const h = syncHarness();
  const close = vi.fn(async () => {});
  const store: MailSyncStore = { exclusive: async (_mailbox, operation) => operation(h.session) };
  const database = vi.fn(() => ({ store, close }));
  expect(await runMailSync([], env, { database, reader: () => h.mail, clock })).toMatchObject({
    exitCode: 0,
  });
  await expect(
    runMailSync([], env, {
      database,
      reader: () => {
        throw new Error("private-init");
      },
    }),
  ).rejects.toThrow();
  expect(close).toHaveBeenCalledTimes(2);
  database.mockClear();
  const controller = new AbortController();
  controller.abort();
  await expect(runMailSync([], env, { database, signal: controller.signal })).rejects.toThrow(
    "cancelled",
  );
  expect(database).not.toHaveBeenCalled();
});

it("propagates ownership loss to an in-flight reader and closes the command pool", async () => {
  const h = syncHarness(syncState());
  const owner = new AbortController();
  const close = vi.fn(async () => {});
  const store: MailSyncStore = {
    exclusive: async (_mailbox, operation) => operation({ ...h.session, signal: owner.signal }),
  };
  const report = await runMailSync([], env, {
    clock,
    database: () => ({ store, close }),
    reader: (_auth, budget) => ({
      ...h.mail,
      listHistory: async () =>
        new Promise((_resolve, reject) => {
          budget.signal.addEventListener("abort", () => reject(new MailReadError("cancelled")), {
            once: true,
          });
          queueMicrotask(() => owner.abort());
        }),
    }),
  });
  expect(report.exitCode).toBe(1);
  expect(report.reasons).toContain("cancelled");
  expect(h.session.savePage).not.toHaveBeenCalled();
  expect(close).toHaveBeenCalledTimes(1);
});

it("automatically recovers with a fresh anchor, mapped coverage and history catch-up", async () => {
  const h = syncHarness(syncState());
  vi.mocked(h.mail.listHistory)
    .mockRejectedValueOnce(new MailReadError("history-expired"))
    .mockResolvedValue({ ids: ["during-recovery"], historyId: "40" });
  vi.mocked(h.mail.currentHistoryId).mockResolvedValue("30");
  vi.mocked(h.session.mappedPage).mockResolvedValue({ ids: ["old-mapped"] });
  const report = await syncMail(options, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({
    exitCode: 0,
    phase: "history",
    discoverySteps: 5,
    pagesCommitted: 3,
    recoveryCount: 1,
    historyGap: true,
    recoveryScope: "recent-window-and-all-mapped-threads",
    evidenceComplete: true,
    recoveryCompletedAt: mailInstant.toISOString(),
  });
  expect(h.mail.listHistory).toHaveBeenLastCalledWith("30", undefined);
  expect(h.mail.readThreadEvidence).toHaveBeenCalledWith("old-mapped");
  expect(h.mail.readThreadEvidence).toHaveBeenCalledWith("during-recovery");
  expect(JSON.stringify(report)).not.toMatch(/old-mapped|during-recovery|previousHistoryId/);
});

it("bounds repeated expiry by discovery steps and preserves a resumable phase", async () => {
  const h = syncHarness(syncState());
  vi.mocked(h.mail.listHistory).mockRejectedValue(new MailReadError("history-expired"));
  const report = await syncMail({ ...options, maxPages: 10 }, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({
    exitCode: 2,
    discoverySteps: 10,
    recoveryCount: 3,
    phase: "recovery-bootstrap",
    evidenceComplete: false,
    recoveryCompletedAt: null,
    evidenceSyncedAt: null,
  });
  expect(h.mail.listHistory).toHaveBeenCalledTimes(3);
});

it("does not initialize recovery after cancellation or leak failed snapshot details", async () => {
  const h = syncHarness(syncState("recovery-required"));
  const controller = new AbortController();
  vi.mocked(h.mail.currentHistoryId).mockImplementation(async () => {
    controller.abort();
    return "30";
  });
  expect(await syncMail(options, { ...h, clock, budget: budget(controller.signal) })).toMatchObject(
    { exitCode: 1, phase: "recovery-required", reasons: ["cancelled"] },
  );
  expect(h.session.beginRecovery).not.toHaveBeenCalled();
  vi.mocked(h.mail.currentHistoryId).mockResolvedValue("30");
  vi.mocked(h.session.beginRecovery).mockRejectedValue(new Error("private-snapshot-sql"));
  const report = await syncMail(options, { ...h, clock, budget: budget() });
  expect(report).toMatchObject({ exitCode: 1, reasons: ["persistence-error"] });
  expect(JSON.stringify(report)).not.toContain("private-snapshot-sql");
});

it("keeps old queued bootstrap work eligible when expiry consumes the last step", async () => {
  const h = syncHarness(syncState());
  h.queue.set("old-known", {
    mailbox: "primary",
    threadId: "old-known",
    generation: 1,
    fromHistory: false,
    attempts: 0,
    availableAt: mailInstant,
  });
  vi.mocked(h.mail.listHistory).mockRejectedValue(new MailReadError("history-expired"));
  const read = threadRead("old-known");
  for (const m of read.evidence.messages) m.receivedAt = "2020-01-01T00:00:00.000Z";
  vi.mocked(h.mail.readThreadEvidence).mockResolvedValue(read);
  expect(
    await syncMail({ ...options, maxPages: 1 }, { ...h, clock, budget: budget() }),
  ).toMatchObject({ phase: "recovery-required", newJobs: 1, excludedThreads: 0, exitCode: 2 });
});
