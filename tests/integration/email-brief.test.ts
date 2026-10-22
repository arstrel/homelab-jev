import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { briefDatabase } from "../../src/adapters/postgres/email-brief.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import {
  briefInputHash,
  briefPolicy,
  type SavedBriefDecision,
} from "../../src/domain/email-brief.js";
import { briefFile, briefGeneration, briefTime } from "../fixtures/email-brief.js";
import { submission } from "../fixtures/ingestion.js";
import { triageResponse } from "../fixtures/triage.js";

const client = connect(testDatabaseUrl(process.env));
const database = briefDatabase(client);
const since = "2026-10-04T00:00:00.000Z",
  until = briefTime;
beforeAll(async () => {
  await applyMigrations(client);
});
beforeEach(async () => {
  await client.pool.query(
    "truncate jev.mail_recovery_targets, jev.mail_retrievals, jev.mail_sync_state, jev.classifications, jev.task_links, jev.pending_jobs, jev.mail_evidence_versions, jev.sources, jev.checkpoints, jev.suppressions, jev.write_intents",
  );
});
afterAll(async () => {
  await client.close();
});
it("selects only current exact evidence, by newest message time rather than last collection", async () => {
  const old = submission();
  await mailEvidenceStore(client).persistEvidence([old]);
  const next = submission();
  next.jobId = randomUUID();
  const message = next.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.subject = "Changed";
  next.observation.observedAt = "2026-10-11T13:00:00.000Z";
  await mailEvidenceStore(client).persistEvidence([next]);
  const newer = submission();
  newer.jobId = randomUUID();
  newer.evidence.source.threadId = "newer";
  const newerMessage = newer.evidence.messages[1];
  if (!newerMessage) throw new Error("fixture");
  newerMessage.receivedAt = "2026-10-11T11:00:00.000Z";
  const future = submission();
  future.jobId = randomUUID();
  future.evidence.source.threadId = "future";
  const futureMessage = future.evidence.messages[1];
  if (!futureMessage) throw new Error("fixture");
  futureMessage.receivedAt = "2026-10-12T00:00:00.000Z";
  const stale = submission();
  stale.jobId = randomUUID();
  stale.evidence.source.threadId = "stale";
  stale.evidence.messages.splice(1);
  stale.observation.messages.splice(1);
  await mailEvidenceStore(client).persistEvidence([newer, future, stale]);
  await database.exclusive(async (session) => {
    const sample = await session.sample(since, until, 1);
    expect(sample.eligible).toBe(2);
    expect(sample.records.map((r) => r.sourceId)).toEqual(["newer"]);
    const all = await session.sample(since, until, 10);
    expect(all.records[1]?.jobId).toBe(next.jobId);
    expect(all.records[1]?.conversation?.evidence.messages[0]?.subject).toBe("Changed");
  });
});
it("atomically saves exact-bound judgments, completes their jobs and reselects saved decisions", async () => {
  await mailEvidenceStore(client).persistEvidence([submission()]);
  await database.exclusive(async (session) => {
    const record = (await session.sample(since, until, 1)).records[0];
    if (!record?.conversation) throw new Error("fixture");
    const saved: SavedBriefDecision = {
      policy: briefPolicy,
      inputHash: briefInputHash(record.fingerprint, record.conversation.directions),
      decision: { type: "jev" as const, result: triageResponse() },
    };
    await session.save(record, saved);
    expect((await session.sample(since, until, 1)).records[0]?.saved).toEqual(saved);
    expect((await client.pool.query("select state from jev.pending_jobs")).rows[0]?.state).toBe(
      "complete",
    );
    // Force an actual insert failure after the job update, exercising rollback.
    await client.pool.query("update jev.pending_jobs set state='pending'");
    await client.pool.query(
      "alter table jev.classifications add constraint fixture_reject check (model_version <> 'owner-rules/v1')",
    );
    try {
      await expect(
        session.save(record, {
          ...saved,
          decision: { type: "owner-rule", reason: "ignored-routine-github" },
        }),
      ).rejects.toThrow();
    } finally {
      await client.pool.query("alter table jev.classifications drop constraint fixture_reject");
    }
    expect((await client.pool.query("select state from jev.pending_jobs")).rows[0]?.state).toBe(
      "pending",
    );
    expect(
      (await client.pool.query("select count(*)::int n from jev.classifications")).rows[0]?.n,
    ).toBe(1);
    await expect(session.save({ ...record, fingerprint: "a".repeat(64) }, saved)).rejects.toThrow(
      "job-changed",
    );
  });
});
it("preserves a reserved file and previous confirmed metadata across interrupted publication", async () => {
  await database.exclusive(async (session) => {
    expect(await session.destination()).toBeUndefined();
    expect(await session.reserve(briefFile)).toEqual({ fileId: briefFile, lastPublished: null });
    expect((await session.reserve("different_file_123")).fileId).toBe(briefFile);
    await session.publishing();
    await session.published(briefFile, briefGeneration, briefTime);
    await session.publishing(); // interrupted next remote write
    expect(await session.destination()).toEqual({
      fileId: briefFile,
      lastPublished: { generation: briefGeneration, publishedAt: briefTime },
    });
    await expect(
      session.published("different_file_123", briefGeneration, briefTime),
    ).rejects.toThrow("destination-changed");
    expect((await client.pool.query("select state from jev.write_intents")).rows[0]?.state).toBe(
      "ambiguous",
    );
  });
});
it("skips an overlapping publisher while allowing collection's distinct lock", async () => {
  await database.exclusive(async () => {
    expect(await database.exclusive(async () => "unexpected")).toBeUndefined();
    const other = await client.pool.connect();
    try {
      const r = await other.query(
        "select pg_try_advisory_lock(hashtextextended('jev:mail-sync:primary',0)) held",
      );
      expect(r.rows[0]?.held).toBe(true);
    } finally {
      other.release(true);
    }
  });
  expect(await database.exclusive(async () => "released")).toBe("released");
});
