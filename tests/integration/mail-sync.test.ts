import { randomUUID } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { mailSyncStore } from "../../src/adapters/postgres/mail-sync.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { classifications, pendingJobs } from "../../src/adapters/postgres/schema.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import type { MailSyncReader, MailSyncSession } from "../../src/application/ports.js";
import { syncMail } from "../../src/application/sync-mail.js";
import { MailReadError } from "../../src/domain/mail-evidence.js";
import { submission } from "../fixtures/ingestion.js";
import { mailInstant, threadRead } from "../fixtures/mail.js";
import { syncState } from "../fixtures/sync.js";

const client = connect(testDatabaseUrl(process.env));
const store = mailSyncStore(client);
beforeAll(async () => {
  await applyMigrations(client);
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await client.pool.query(
    "truncate jev.mail_recovery_targets, jev.mail_retrievals, jev.mail_sync_state, jev.classifications, jev.task_links, jev.pending_jobs, jev.mail_evidence_versions, jev.sources, jev.checkpoints, jev.suppressions, jev.write_intents",
  );
});
async function sessionTest(run: (session: MailSyncSession) => Promise<void>) {
  expect(
    await store.exclusive("primary", async (session) => {
      await run(session);
      return true;
    }),
  ).toBe(true);
}
function reader(): MailSyncReader {
  return {
    currentHistoryId: vi.fn(async () => "10"),
    listThreads: vi.fn(async () => ({ ids: [] })),
    listHistory: vi.fn(async () => ({ ids: [], historyId: "20" })),
    readThreadEvidence: vi.fn(async (id) => threadRead(id)),
  };
}
async function run(mail: MailSyncReader, now = mailInstant, maxPages = 5, maxThreads = 20) {
  const result = await store.exclusive("primary", async (session) => {
    const budget = new MailBudget({}, session.signal);
    try {
      return await syncMail(
        { maxPages, maxThreads },
        { mail, session, budget, clock: { now: () => new Date(now), id: randomUUID } },
      );
    } finally {
      budget.close();
    }
  });
  if (!result) throw new Error("Unexpected test overlap");
  return result;
}
it("atomically enqueues pages and rolls back queue changes on stale revision", async () => {
  await sessionTest(async (session) => {
    const state = syncState();
    await session.initialize(state);
    const next = { ...state, historyId: "20", revision: 1, discoveryCheckedAt: mailInstant };
    await session.savePage(state, next, ["t-boiler", "t-boiler"], true, mailInstant);
    await expect(
      session.savePage(state, next, ["must-rollback"], true, mailInstant),
    ).rejects.toThrow();
    expect((await session.due(mailInstant, 20)).map((w) => w.threadId)).toEqual(["t-boiler"]);
    expect((await session.state())?.historyId).toBe("20");
    expect(await session.finish(true)).toMatchObject({
      pending: 1,
      state: { evidenceSyncedAt: null },
    });
  });
});
it("retains work when evidence persistence fails and atomically acknowledges exact evidence", async () => {
  await mailEvidenceStore(client).persistEvidence([submission()]);
  await sessionTest(async (session) => {
    const state = syncState();
    await session.initialize(state);
    await session.savePage(
      state,
      { ...state, revision: 1 },
      ["different-thread"],
      true,
      mailInstant,
    );
    const [work] = await session.due(mailInstant, 20);
    if (!work) throw new Error("Missing fixture work");
    const input = submission();
    input.evidence.source.threadId = work.threadId;
    await expect(session.acknowledge(work, input)).rejects.toThrow(); // Job UUID collides after queue deletion/version insert.
    expect(await session.due(mailInstant, 20)).toHaveLength(1);
    expect(
      (await client.pool.query("select count(*)::int as n from jev.mail_evidence_versions")).rows[0]
        ?.n,
    ).toBe(1);
    expect(await session.acknowledge(work, { ...input, jobId: randomUUID() })).toMatchObject({
      newVersions: 1,
      newJobs: 1,
    });
    expect(await session.due(mailInstant, 20)).toHaveLength(0);
  });
});
it("rejects stale generations and persists retries across sessions", async () => {
  await sessionTest(async (session) => {
    const state = syncState();
    await session.initialize(state);
    const next = { ...state, revision: 1 };
    await session.savePage(state, next, ["t-boiler"], false, mailInstant);
    const [old] = await session.due(mailInstant, 20);
    if (!old) throw new Error("Missing work");
    await session.savePage(next, { ...next, revision: 2 }, ["t-boiler"], true, mailInstant);
    await expect(session.acknowledge(old)).rejects.toThrow();
    const [work] = await session.due(mailInstant, 20);
    if (!work) throw new Error("Missing work");
    expect(work.fromHistory).toBe(true);
    await session.retry(work, "partial-body", new Date(mailInstant.getTime() + 300_000));
  });
  await sessionTest(async (session) => {
    expect(await session.due(mailInstant, 20)).toEqual([]);
    const [work] = await session.due(new Date(mailInstant.getTime() + 300_000), 20);
    expect(work).toMatchObject({ attempts: 1, fromHistory: true });
    expect(await session.finish(true)).toMatchObject({
      pending: 1,
      retrying: 1,
      state: { evidenceSyncedAt: null },
    });
  });
});
it("skips overlapping owners and releases the dedicated lock on success and thrown errors", async () => {
  let release = () => {};
  let ready = () => {};
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const acquired = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const first = store.exclusive("primary", async () => {
    ready();
    await hold;
    return "first";
  });
  await acquired;
  const callback = vi.fn(async () => "must-not-run");
  expect(await store.exclusive("primary", callback)).toBeUndefined();
  expect(callback).not.toHaveBeenCalled();
  release();
  expect(await first).toBe("first");
  await expect(
    store.exclusive("primary", async () => {
      throw new Error("fixture failure");
    }),
  ).rejects.toThrow();
  expect(await store.exclusive("primary", async () => "reacquired")).toBe("reacquired");
});
it("cancels ownership and prevents commits when the owning backend is terminated", async () => {
  await sessionTest(async (session) => {
    await session.initialize(syncState());
    const aborted = new Promise<void>((resolve) =>
      session.signal.addEventListener("abort", () => resolve(), { once: true }),
    );
    await client.pool.query(
      "select pg_terminate_backend(pid) from pg_locks where locktype = 'advisory' and granted and pid <> pg_backend_pid()",
    );
    await aborted;
    expect(session.signal.aborted).toBe(true);
    await expect(
      session.savePage(
        syncState(),
        { ...syncState(), revision: 1 },
        ["must-not-save"],
        true,
        mailInstant,
      ),
    ).rejects.toThrow("cancelled");
  });
  expect(await store.exclusive("primary", async () => "reacquired")).toBe("reacquired");
});
it("resumes a fixed bootstrap and catches mail arriving during bootstrap through its original anchor", async () => {
  const mail = reader();
  vi.mocked(mail.listThreads)
    .mockResolvedValueOnce({ ids: ["t-boiler"], nextToken: "page2" })
    .mockResolvedValueOnce({ ids: [] });
  vi.mocked(mail.listHistory).mockResolvedValue({ ids: ["new-during-bootstrap"], historyId: "20" });
  expect(await run(mail, mailInstant, 1)).toMatchObject({
    phase: "bootstrap",
    exitCode: 2,
    newJobs: 1,
  });
  expect(await run(mail, new Date(mailInstant.getTime() + 300_000), 1)).toMatchObject({
    phase: "history",
    exitCode: 2,
  });
  expect(await run(mail, new Date(mailInstant.getTime() + 600_000))).toMatchObject({
    discoveryCaughtUp: true,
    evidenceComplete: true,
    newJobs: 1,
    exitCode: 0,
  });
  expect(mail.currentHistoryId).toHaveBeenCalledTimes(1);
  expect(mail.listHistory).toHaveBeenCalledWith("10", undefined);
  expect(vi.mocked(mail.listThreads).mock.calls[0]?.[0]).toBe(
    vi.mocked(mail.listThreads).mock.calls[1]?.[0],
  );
  expect(vi.mocked(mail.listThreads).mock.calls[1]?.[1]).toBe("page2");
});
it("retries partial evidence with no new mail and keeps discovery ahead of evidence freshness", async () => {
  await sessionTest(async (session) => {
    await session.initialize(syncState());
  });
  const mail = reader();
  vi.mocked(mail.listHistory)
    .mockResolvedValueOnce({ ids: ["t-boiler"], historyId: "20" })
    .mockResolvedValue({ ids: [], historyId: "20" });
  const partial = threadRead();
  partial.evidence.coverage.messageBodies = "partial";
  vi.mocked(mail.readThreadEvidence).mockResolvedValueOnce(partial).mockResolvedValue(threadRead());
  expect(await run(mail)).toMatchObject({
    discoveryCaughtUp: true,
    evidenceComplete: false,
    partialThreads: 1,
    pendingRetrievals: 1,
    evidenceSyncedAt: null,
    exitCode: 1,
  });
  expect(await run(mail, new Date(mailInstant.getTime() + 60_000))).toMatchObject({
    retrievalsAttempted: 0,
    retryingRetrievals: 1,
    evidenceSyncedAt: null,
  });
  expect(await run(mail, new Date(mailInstant.getTime() + 300_000))).toMatchObject({
    evidenceComplete: true,
    pendingRetrievals: 0,
    newJobs: 1,
    exitCode: 0,
  });
});
it("preserves resumable failed history pages and makes label-only/no-change runs create no jobs", async () => {
  await sessionTest(async (session) => {
    await session.initialize(syncState());
  });
  const mail = reader();
  vi.mocked(mail.listHistory)
    .mockResolvedValueOnce({ ids: ["t-boiler"], historyId: "20", nextToken: "next" })
    .mockRejectedValueOnce(new Error("private-provider"));
  expect(await run(mail)).toMatchObject({ discoveryCaughtUp: false, newJobs: 1, exitCode: 1 });
  vi.mocked(mail.listHistory).mockResolvedValue({ ids: ["t-boiler"], historyId: "20" });
  const second = await run(mail, new Date(mailInstant.getTime() + 300_000));
  expect(mail.listHistory).toHaveBeenLastCalledWith("10", "next");
  expect(second).toMatchObject({ evidenceComplete: true, newJobs: 0, newVersions: 0 });
  vi.mocked(mail.listHistory).mockResolvedValue({ ids: [], historyId: "20" });
  const third = await run(mail, new Date(mailInstant.getTime() + 600_000));
  expect(third).toMatchObject({ evidenceComplete: true, newJobs: 0, retrievalsAttempted: 0 });
  expect(third.evidenceSyncedAt).not.toBe(second.evidenceSyncedAt);
  expect(JSON.stringify(third)).not.toMatch(/t-boiler|private-provider|example.com/);
});
it("retains the expired anchor when capped and when fresh anchor acquisition fails", async () => {
  await sessionTest(async (session) => {
    await session.initialize(syncState());
  });
  const mail = reader();
  vi.mocked(mail.listHistory).mockRejectedValue(new MailReadError("history-expired"));
  expect(await run(mail, mailInstant, 1)).toMatchObject({
    phase: "recovery-required",
    historyGap: true,
    evidenceComplete: false,
    exitCode: 2,
  });
  vi.mocked(mail.currentHistoryId).mockRejectedValue(new Error("private-profile-error"));
  expect(await run(mail)).toMatchObject({ phase: "recovery-required", exitCode: 1 });
  expect(mail.listHistory).toHaveBeenCalledTimes(1);
  await sessionTest(async (session) => {
    expect((await session.state())?.historyId).toBe("10");
  });
});

it("retains pending exact inputs after classification rollback and later discovery progress", async () => {
  await sessionTest(async (session) => {
    await session.initialize(syncState());
  });
  const mail = reader();
  vi.mocked(mail.listHistory)
    .mockResolvedValueOnce({ ids: ["t-boiler"], historyId: "20" })
    .mockResolvedValueOnce({ ids: ["later-thread"], historyId: "30" });
  await run(mail);
  const [job] = await client.db.select().from(pendingJobs);
  if (!job) throw new Error("Missing pending fixture");
  await expect(
    client.db.transaction(async (tx) => {
      await tx.insert(classifications).values({
        id: randomUUID(),
        jobId: job.id,
        modelVersion: "fake-model",
        result: { attention: true },
        createdAt: mailInstant,
      });
      throw new Error("injected classification transaction failure");
    }),
  ).rejects.toThrow("injected classification");
  expect(await run(mail, new Date(mailInstant.getTime() + 300_000))).toMatchObject({ newJobs: 1 });
  expect(await mailEvidenceStore(client).evidenceForJob(job.id)).toEqual({
    status: "ready",
    evidence: threadRead().evidence,
  });
  expect((await client.db.select().from(pendingJobs)).map((row) => row.state)).toEqual([
    "pending",
    "pending",
  ]);
  await sessionTest(async (session) => {
    expect((await session.state())?.historyId).toBe("30");
  });
});
it("upgrades populated 0002 through failed/repaired 0003 without losing evidence or legacy records", async () => {
  const folder = mkdtempSync(join(tmpdir(), "jev-sync-upgrade-"));
  try {
    cpSync("migrations", folder, { recursive: true });
    const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8"));
    journal.entries = journal.entries.slice(0, 4);
    const newest = journal.entries.pop();
    for (const entry of [...journal.entries, newest]) {
      const path = join(folder, `${entry.tag}.sql`);
      writeFileSync(path, readFileSync(path, "utf8").replaceAll('"jev"', '"jev_sync_upgrade"'));
    }
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    const config = { migrationsFolder: folder, migrationsSchema: "jev_sync_upgrade_migrations" };
    await migrate(client.db, config);
    const input = submission();
    await client.pool.query(
      "insert into jev_sync_upgrade.sources (mailbox,source_id,fingerprint,observed_at) values ('primary','t-boiler','old',now())",
    );
    await client.pool.query(
      "insert into jev_sync_upgrade.mail_evidence_versions values ('primary','t-boiler','old','mail-evidence/v1',$1,now())",
      [input.evidence],
    );
    await client.pool.query(
      "insert into jev_sync_upgrade.checkpoints values ('primary','10',now())",
    );
    await client.pool.query(
      "insert into jev_sync_upgrade.pending_jobs (id,mailbox,source_id,fingerprint,evidence_fingerprint,policy_version,available_at) values ($1,'primary','t-boiler','old','old','fixture',now())",
      [input.jobId],
    );
    journal.entries.push(newest);
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    const path = join(folder, `${newest.tag}.sql`);
    const reviewed = readFileSync(path, "utf8");
    writeFileSync(path, `${reviewed}\n--> statement-breakpoint\nSELECT deliberately_invalid_sql;`);
    await expect(migrate(client.db, config)).rejects.toThrow();
    expect(
      (await client.pool.query("select to_regclass('jev_sync_upgrade.mail_sync_state') as name"))
        .rows[0]?.name,
    ).toBeNull();
    writeFileSync(path, reviewed);
    await migrate(client.db, config);
    await migrate(client.db, config);
    expect(
      (
        await client.pool.query(
          "select count(*)::int as n from jev_sync_upgrade.mail_evidence_versions",
        )
      ).rows[0]?.n,
    ).toBe(1);
    expect(
      (await client.pool.query("select evidence_fingerprint from jev_sync_upgrade.pending_jobs"))
        .rows[0]?.evidence_fingerprint,
    ).toBe("old");
    expect(
      (await client.pool.query("select history_id from jev_sync_upgrade.checkpoints")).rows[0]
        ?.history_id,
    ).toBe("10");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
