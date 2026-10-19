import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { ingestMail } from "../../src/application/ingest-mail.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import { submission } from "../fixtures/ingestion.js";
import { mailInstant, threadRead } from "../fixtures/mail.js";

const client = connect(testDatabaseUrl(process.env));
const store = mailEvidenceStore(client);
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
it("persists exact versions atomically and replays without duplicate jobs or checkpoints", async () => {
  const input = submission();
  expect(await store.persistEvidence([input])).toEqual({
    newVersions: 1,
    newJobs: 1,
    boundLegacyJobs: 0,
  });
  expect(await store.persistEvidence([{ ...input, jobId: randomUUID() }])).toEqual({
    newVersions: 0,
    newJobs: 0,
    boundLegacyJobs: 0,
  });
  expect(await mailEvidenceStore(client).evidenceForJob(input.jobId)).toEqual({
    status: "ready",
    evidence: input.evidence,
  });
  expect(
    (await client.pool.query("select count(*)::int as n from jev.checkpoints")).rows[0]?.n,
  ).toBe(0);
});
it("preserves the old job payload after a new reply and ignores observation-only changes", async () => {
  const old = submission();
  await store.persistEvidence([old]);
  const observed = submission();
  observed.jobId = randomUUID();
  observed.observation.observedAt = "2026-10-12T12:00:00.000Z";
  for (const message of observed.observation.messages) message.labels = ["UNREAD"];
  expect(await store.persistEvidence([observed])).toMatchObject({ newVersions: 0, newJobs: 0 });
  const next = submission();
  next.jobId = randomUUID();
  next.observation.observedAt = "2026-10-13T12:00:00.000Z";
  const first = next.evidence.messages[0];
  if (!first) throw new Error("Missing fixture");
  next.evidence.messages.push({
    ...first,
    id: "new-reply",
    receivedAt: "2026-10-13T11:00:00.000Z",
    body: { status: "complete", text: "Confirmed." },
  });
  next.observation.messages.push({ id: "new-reply", labels: [], direction: "incoming" });
  expect(await store.persistEvidence([next])).toMatchObject({ newVersions: 1, newJobs: 1 });
  expect(await store.evidenceForJob(old.jobId)).toEqual({
    status: "ready",
    evidence: old.evidence,
  });
  expect(await store.evidenceForJob(next.jobId)).toEqual({
    status: "ready",
    evidence: next.evidence,
  });
  await store.persistEvidence([{ ...old, jobId: randomUUID() }]);
  expect(
    (await client.pool.query("select fingerprint from jev.sources")).rows[0]?.fingerprint,
  ).toBe(fingerprint(next.evidence));
});
it("deduplicates overlapping batches and keeps policy identity separate", async () => {
  const input = submission();
  const outcomes = await Promise.all(
    Array.from({ length: 4 }, () => store.persistEvidence([{ ...input, jobId: randomUUID() }])),
  );
  expect(outcomes.reduce((n, c) => n + c.newVersions, 0)).toBe(1);
  expect(outcomes.reduce((n, c) => n + c.newJobs, 0)).toBe(1);
  expect(
    await store.persistEvidence([{ ...input, jobId: randomUUID(), policyVersion: "fixture/v2" }]),
  ).toMatchObject({ newVersions: 0, newJobs: 1 });
});
it("rolls back newly inserted evidence and source updates when job insertion fails", async () => {
  const input = submission();
  await store.persistEvidence([input]);
  const bad = submission();
  bad.evidence.source.threadId = "different-thread";
  await expect(store.persistEvidence([bad])).rejects.toThrow(); // Deliberate job primary-key collision after version insert.
  expect(
    (await client.pool.query("select count(*)::int as n from jev.mail_evidence_versions")).rows[0]
      ?.n,
  ).toBe(1);
  expect((await client.pool.query("select count(*)::int as n from jev.sources")).rows[0]?.n).toBe(
    1,
  );
  expect(await store.evidenceForJob(input.jobId)).toEqual({
    status: "ready",
    evidence: input.evidence,
  });
});
it("enforces immutable payloads, exact bindings and retention while jobs reference evidence", async () => {
  await store.persistEvidence([submission()]);
  await expect(
    client.pool.query("update jev.mail_evidence_versions set evidence = '{}'::jsonb"),
  ).rejects.toThrow("immutable");
  await expect(client.pool.query("delete from jev.mail_evidence_versions")).rejects.toThrow();
  await expect(
    client.pool.query("update jev.pending_jobs set evidence_fingerprint = 'missing'"),
  ).rejects.toThrow();
  await expect(
    client.pool.query("update jev.pending_jobs set fingerprint = 'wrong'"),
  ).rejects.toThrow();
  await expect(
    client.pool.query(
      "insert into jev.mail_evidence_versions values ('primary','t-boiler','bad','mail-evidence/v1','{}',now())",
    ),
  ).rejects.toThrow();
});
it("reports legacy gaps and only binds exactly recovered evidence without resetting completed work", async () => {
  const input = submission();
  const hash = fingerprint(input.evidence);
  await client.pool.query(
    "insert into jev.sources (mailbox,source_id,fingerprint,observed_at) values ('primary','t-boiler',$1,now())",
    [hash],
  );
  await client.pool.query(
    "insert into jev.pending_jobs (id,mailbox,source_id,fingerprint,policy_version,available_at,attempts,state) values ($1,'primary','t-boiler',$2,$3,$4,3,'complete')",
    [input.jobId, hash, input.policyVersion, input.availableAt],
  );
  expect(await store.evidenceForJob(input.jobId)).toEqual({ status: "missing-evidence" });
  expect(await store.evidenceForJob(randomUUID())).toEqual({ status: "missing-job" });
  expect(await store.persistEvidence([{ ...input, jobId: randomUUID() }])).toEqual({
    newVersions: 1,
    newJobs: 0,
    boundLegacyJobs: 1,
  });
  expect(await store.evidenceForJob(input.jobId)).toEqual({
    status: "ready",
    evidence: input.evidence,
  });
  expect(
    (await client.pool.query("select attempts,state,available_at from jev.pending_jobs")).rows,
  ).toEqual([{ attempts: 3, state: "complete", available_at: input.availableAt }]);
});
it("rejects partial evidence before any SQL and handles an empty batch", async () => {
  const input = submission();
  input.evidence.coverage.messageBodies = "partial";
  await expect(store.persistEvidence([input])).rejects.toThrow(/^invalid-data$/);
  expect(await store.persistEvidence([])).toEqual({
    newVersions: 0,
    newJobs: 0,
    boundLegacyJobs: 0,
  });
  expect((await client.pool.query("select count(*)::int as n from jev.sources")).rows[0]?.n).toBe(
    0,
  );
});

it("never substitutes newer evidence for an unbound legacy job", async () => {
  const input = submission();
  await client.pool.query(
    "insert into jev.sources (mailbox,source_id,fingerprint,observed_at) values ('primary','t-boiler','unrecoverable-old-hash',now())",
  );
  await client.pool.query(
    "insert into jev.pending_jobs (id,mailbox,source_id,fingerprint,policy_version,available_at) values ($1,'primary','t-boiler','unrecoverable-old-hash',$2,$3)",
    [input.jobId, input.policyVersion, input.availableAt],
  );
  await store.persistEvidence([{ ...input, jobId: randomUUID() }]);
  expect(await store.evidenceForJob(input.jobId)).toEqual({ status: "missing-evidence" });
});

it("runs bounded ingestion end to end against PostgreSQL with synthetic mail and replay", async () => {
  const budget = new MailBudget();
  try {
    const mail = {
      listThreads: async () => ({ ids: ["t-boiler", "partial-thread"] }),
      readThreadEvidence: async (id: string) => {
        const read = threadRead(id);
        if (id === "partial-thread") read.evidence.coverage.messageBodies = "partial";
        return read;
      },
    };
    const deps = {
      mail,
      store,
      budget,
      clock: { now: () => new Date(mailInstant), id: randomUUID },
    };
    const first = await ingestMail({ days: 30, maxThreads: 20 }, deps);
    const second = await ingestMail({ days: 30, maxThreads: 20 }, deps);
    expect(first).toMatchObject({
      exitCode: 1,
      partialThreads: 1,
      persistence: { newVersions: 1, newJobs: 1 },
    });
    expect(second).toMatchObject({
      exitCode: 1,
      persistence: { newVersions: 0, newJobs: 0, reusedVersions: 1 },
    });
    expect(
      (await client.pool.query("select count(*)::int as n from jev.checkpoints")).rows[0]?.n,
    ).toBe(0);
    expect(
      (await client.pool.query("select count(*)::int as n from jev.write_intents")).rows[0]?.n,
    ).toBe(0);
  } finally {
    budget.close();
  }
});
