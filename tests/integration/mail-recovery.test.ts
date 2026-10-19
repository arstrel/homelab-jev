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
import { sources, taskLinks } from "../../src/adapters/postgres/schema.js";
import { ingestionPolicyVersion } from "../../src/application/ingest-mail.js";
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
async function sessionTest(operation: (session: MailSyncSession) => Promise<void>) {
  expect(
    await store.exclusive("primary", async (session) => {
      await operation(session);
      return true;
    }),
  ).toBe(true);
}
async function mappings(ids: string[]) {
  await client.db.insert(sources).values(
    ids.map((sourceId) => ({
      mailbox: "primary",
      sourceId,
      fingerprint: "old",
      observedAt: mailInstant,
    })),
  );
  await client.db.insert(taskLinks).values(
    ids.map((sourceId) => ({
      mailbox: "primary",
      sourceId,
      obligationKey: `obligation-${sourceId}`,
      taskId: `task-${sourceId}`,
    })),
  );
}
function reader(): MailSyncReader {
  return {
    currentHistoryId: vi.fn(async () => "30"),
    listThreads: vi.fn(async () => ({ ids: [] })),
    listHistory: vi.fn(async () => ({ ids: [], historyId: "40" })),
    readThreadEvidence: vi.fn(async (id) => threadRead(id)),
  };
}
async function run(mail: MailSyncReader, maxPages = 5, now = mailInstant) {
  const result = await store.exclusive("primary", async (session) => {
    const budget = new MailBudget({}, session.signal);
    try {
      return await syncMail(
        { maxPages, maxThreads: 500 },
        {
          mail,
          session,
          budget,
          clock: { now: () => new Date(now), id: randomUUID },
        },
      );
    } finally {
      budget.close();
    }
  });
  if (!result) throw new Error("Unexpected overlap");
  return result;
}

it("snapshots mappings atomically, retains backlog retry state and rejects stale acknowledgements", async () => {
  await mappings(["mapped-a", "mapped-b"]);
  await sessionTest(async (session) => {
    const initial = syncState("recovery-required");
    await session.initialize(initial);
    const previous = { ...initial, revision: 1 };
    await session.savePage(initial, previous, ["old-queued"], false, mailInstant);
    const [work] = await session.due(mailInstant, 10);
    if (!work) throw new Error("Missing work");
    const later = new Date(mailInstant.getTime() + 300_000);
    await session.retry(work, "partial-body", later);
    const next = {
      ...previous,
      phase: "recovery-bootstrap" as const,
      revision: 2,
      recoveryCount: 1,
      historyId: "30",
      historyGap: true,
      recoveryStartedAt: mailInstant,
    };
    await expect(
      session.beginRecovery({ ...previous, revision: 0 }, { ...next, revision: 1 }),
    ).rejects.toThrow();
    expect(await session.mappedPage(null)).toEqual({ ids: [] });
    expect((await session.due(later, 10))[0]).toMatchObject({
      generation: 1,
      fromHistory: false,
      attempts: 1,
    });
    await session.beginRecovery(previous, next);
    expect(await session.mappedPage(null)).toEqual({ ids: ["mapped-a", "mapped-b"] });
    expect(await session.due(mailInstant, 10)).toEqual([]);
    expect((await session.due(later, 10))[0]).toMatchObject({
      generation: 2,
      fromHistory: true,
      attempts: 1,
    });
    await expect(session.acknowledge(work)).rejects.toThrow();
    expect(
      (await client.pool.query("select failure from jev.mail_retrievals")).rows[0]?.failure,
    ).toBe("partial-body");
  });
});

it("resumes each recovery stage, freezes mapped inventory and catches mail arriving during scans", async () => {
  await mappings(Array.from({ length: 101 }, (_, i) => `mapped-${String(i).padStart(3, "0")}`));
  await sessionTest(async (session) => {
    await session.initialize(syncState("recovery-required"));
  });
  const mail = reader();
  vi.mocked(mail.listThreads)
    .mockResolvedValueOnce({ ids: ["recent"], nextToken: "recent-page-2" })
    .mockResolvedValue({ ids: [] });
  vi.mocked(mail.listHistory).mockResolvedValue({
    ids: ["arrived-during-recovery"],
    historyId: "40",
  });
  vi.mocked(mail.readThreadEvidence).mockImplementation(async (id) => {
    const read = threadRead(id);
    if (id.startsWith("mapped-"))
      for (const m of read.evidence.messages) m.receivedAt = "2020-01-01T00:00:00.000Z";
    return read;
  });
  expect(await run(mail, 1)).toMatchObject({
    phase: "recovery-bootstrap",
    pagesCommitted: 0,
    exitCode: 2,
  });
  await client.pool.query("delete from jev.task_links where source_id = 'mapped-100'");
  expect(await run(mail, 1)).toMatchObject({
    phase: "recovery-bootstrap",
    newJobs: 1,
    exitCode: 2,
  });
  expect(await run(mail, 1)).toMatchObject({ phase: "recovery-mapped", exitCode: 2 });
  expect(await run(mail, 1)).toMatchObject({ phase: "recovery-mapped", newJobs: 100, exitCode: 2 });
  expect(await run(mail, 1)).toMatchObject({
    phase: "history",
    newJobs: 1,
    evidenceComplete: false,
    exitCode: 2,
  });
  expect(await run(mail, 1)).toMatchObject({
    phase: "history",
    newJobs: 1,
    evidenceComplete: true,
    exitCode: 0,
    historyGap: true,
    recoveryCount: 1,
    recoveryCompletedAt: mailInstant.toISOString(),
  });
  expect(mail.currentHistoryId).toHaveBeenCalledTimes(1);
  expect(mail.listHistory).toHaveBeenCalledWith("30", undefined);
  const queries = vi.mocked(mail.listThreads).mock.calls;
  expect(queries[0]?.[0]).toBe(queries[1]?.[0]);
  expect(queries[1]?.[1]).toBe("recent-page-2");
  expect(mail.readThreadEvidence).toHaveBeenCalledWith("mapped-100");
  expect(
    (await client.pool.query("select count(*)::int as n from jev.mail_recovery_targets")).rows[0]
      ?.n,
  ).toBe(0);
  expect(
    (await client.pool.query("select count(*)::int as n from jev.pending_jobs")).rows[0]?.n,
  ).toBe(103);
});

it("preserves mappings, suppressions and exact job inputs when mapped mail is missing or unchanged", async () => {
  const input = submission();
  input.policyVersion = ingestionPolicyVersion;
  for (const message of input.observation.messages) message.labels.push("UNREAD");
  await mailEvidenceStore(client).persistEvidence([input]);
  await client.db.insert(taskLinks).values({
    mailbox: "primary",
    sourceId: "t-boiler",
    obligationKey: "kept",
    taskId: "kept-task",
    overrides: { due: "manual" },
  });
  await mappings(["missing"]);
  await client.pool.query("insert into jev.suppressions values ('kept', 'completed', $1)", [
    mailInstant,
  ]);
  await sessionTest(async (session) => {
    await session.initialize(syncState());
  });
  const mail = reader();
  vi.mocked(mail.listHistory)
    .mockRejectedValueOnce(new MailReadError("history-expired"))
    .mockResolvedValue({ ids: [], historyId: "40" });
  vi.mocked(mail.readThreadEvidence).mockImplementation(async (id) => {
    if (id === "missing") throw new MailReadError("missing-thread");
    return threadRead(id);
  });
  const first = await run(mail);
  expect(first).toMatchObject({
    evidenceComplete: true,
    missingThreads: 1,
    newVersions: 0,
    newJobs: 0,
    historyGap: true,
  });
  expect(await mailEvidenceStore(client).evidenceForJob(input.jobId)).toEqual({
    status: "ready",
    evidence: input.evidence,
  });
  expect(
    (await client.db.select().from(taskLinks)).find((link) => link.taskId === "kept-task")
      ?.overrides,
  ).toEqual({ due: "manual" });
  expect(
    (await client.pool.query("select count(*)::int as n from jev.suppressions")).rows[0]?.n,
  ).toBe(1);
  expect(await run(mail)).toMatchObject({
    evidenceComplete: true,
    newJobs: 0,
    retrievalsAttempted: 0,
    historyGap: true,
  });
});

it("does not advance previous evidence freshness until partial mapped mail is retried successfully", async () => {
  await mappings(["partial"]);
  const old = new Date("2026-09-01T00:00:00.000Z");
  await sessionTest(async (session) => {
    await session.initialize({
      ...syncState("recovery-required"),
      evidenceSyncedAt: old,
      discoveryCheckedAt: old,
    });
  });
  const mail = reader();
  const partial = threadRead("partial");
  partial.evidence.coverage.messageBodies = "partial";
  vi.mocked(mail.readThreadEvidence)
    .mockResolvedValueOnce(partial)
    .mockResolvedValue(threadRead("partial"));
  expect(await run(mail)).toMatchObject({
    discoveryCaughtUp: true,
    evidenceComplete: false,
    partialThreads: 1,
    evidenceSyncedAt: old.toISOString(),
    recoveryCompletedAt: null,
  });
  expect(await run(mail, 5, new Date(mailInstant.getTime() + 60_000))).toMatchObject({
    retryingRetrievals: 1,
    recoveryCompletedAt: null,
    evidenceSyncedAt: old.toISOString(),
  });
  const later = new Date(mailInstant.getTime() + 300_000);
  expect(await run(mail, 5, later)).toMatchObject({
    evidenceComplete: true,
    newJobs: 1,
    recoveryCompletedAt: later.toISOString(),
    evidenceSyncedAt: later.toISOString(),
    historyGap: true,
  });
});

it("retains unfinished targets across renewed recovery and rolls back failed final target queueing", async () => {
  await mappings(["retained"]);
  await sessionTest(async (session) => {
    const initial = syncState("recovery-required");
    await session.initialize(initial);
    const first = {
      ...initial,
      phase: "recovery-bootstrap" as const,
      revision: 1,
      recoveryCount: 1,
    };
    await session.beginRecovery(initial, first);
    await client.pool.query("delete from jev.task_links");
    const expired = { ...first, phase: "recovery-required" as const, revision: 2 };
    await session.savePage(first, expired, [], true, mailInstant);
    const second = { ...first, revision: 3, recoveryCount: 2 };
    await session.beginRecovery(expired, second);
    expect(await session.mappedPage(null)).toEqual({ ids: ["retained"] });
    const mapped = { ...second, phase: "recovery-mapped" as const, revision: 4 };
    await session.savePage(second, mapped, [], false, mailInstant);
    await expect(
      session.savePage(
        { ...mapped, revision: 0 },
        { ...mapped, phase: "history", revision: 1 },
        ["retained"],
        true,
        mailInstant,
      ),
    ).rejects.toThrow();
    expect(await session.mappedPage(null)).toEqual({ ids: ["retained"] });
    expect(await session.due(mailInstant, 10)).toEqual([]);
    await session.savePage(
      mapped,
      { ...mapped, phase: "history", revision: 5 },
      ["retained"],
      true,
      mailInstant,
    );
    expect(await session.mappedPage(null)).toEqual({ ids: [] });
    expect((await session.due(mailInstant, 10))[0]?.threadId).toBe("retained");
  });
});

it("upgrades populated 0003 atomically through failed/repaired 0004 preserving recovery defaults and ledger", async () => {
  const folder = mkdtempSync(join(tmpdir(), "jev-recovery-upgrade-"));
  try {
    cpSync("migrations", folder, { recursive: true });
    const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8"));
    journal.entries = journal.entries.slice(0, 5);
    const latest = journal.entries.pop();
    for (const entry of [...journal.entries, latest]) {
      const path = join(folder, `${entry.tag}.sql`);
      writeFileSync(path, readFileSync(path, "utf8").replaceAll('"jev"', '"jev_recovery_upgrade"'));
    }
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    const config = {
      migrationsFolder: folder,
      migrationsSchema: "jev_recovery_upgrade_migrations",
    };
    await migrate(client.db, config);
    await client.pool.query(
      "insert into jev_recovery_upgrade.mail_sync_state (mailbox, phase, days, window_since, window_until, history_id) values ('primary','recovery-required',30,'2026-09-01','2026-10-01','10')",
    );
    await client.pool.query(
      "insert into jev_recovery_upgrade.mail_retrievals (mailbox,thread_id,available_at,attempts,failure) values ('primary','known',now(),2,'partial-body')",
    );
    await client.pool.query(
      "insert into jev_recovery_upgrade.sources values ('primary','known','old',now(),null)",
    );
    await client.pool.query(
      "insert into jev_recovery_upgrade.task_links values ('primary','known','obligation','task','{}')",
    );
    const evidence = threadRead("known").evidence;
    await client.pool.query(
      "insert into jev_recovery_upgrade.mail_evidence_versions values ('primary','known','old','mail-evidence/v1',$1,$2)",
      [evidence, mailInstant],
    );
    await client.pool.query(
      "insert into jev_recovery_upgrade.pending_jobs (id,mailbox,source_id,fingerprint,evidence_fingerprint,policy_version,available_at) values ($1,'primary','known','old','old','fixture',$2)",
      [randomUUID(), mailInstant],
    );
    journal.entries.push(latest);
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    const path = join(folder, `${latest.tag}.sql`);
    const reviewed = readFileSync(path, "utf8");
    writeFileSync(path, `${reviewed}\n--> statement-breakpoint\nSELECT deliberately_invalid_sql;`);
    await expect(migrate(client.db, config)).rejects.toThrow();
    expect(
      (
        await client.pool.query(
          "select to_regclass('jev_recovery_upgrade.mail_recovery_targets') as name",
        )
      ).rows[0]?.name,
    ).toBeNull();
    writeFileSync(path, reviewed);
    await migrate(client.db, config);
    await migrate(client.db, config);
    expect(
      (
        await client.pool.query(
          "select phase, history_id, recovery_count, history_gap from jev_recovery_upgrade.mail_sync_state",
        )
      ).rows[0],
    ).toEqual({
      phase: "recovery-required",
      history_id: "10",
      recovery_count: 0,
      history_gap: true,
    });
    expect(
      (
        await client.pool.query(
          "select attempts, failure from jev_recovery_upgrade.mail_retrievals",
        )
      ).rows[0],
    ).toEqual({ attempts: 2, failure: "partial-body" });
    expect(
      (await client.pool.query("select task_id from jev_recovery_upgrade.task_links")).rows[0]
        ?.task_id,
    ).toBe("task");
    expect(
      (await client.pool.query("select evidence from jev_recovery_upgrade.mail_evidence_versions"))
        .rows[0]?.evidence,
    ).toEqual(evidence);
    expect(
      (
        await client.pool.query(
          "select evidence_fingerprint from jev_recovery_upgrade.pending_jobs",
        )
      ).rows[0]?.evidence_fingerprint,
    ).toBe("old");
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
