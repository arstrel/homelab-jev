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

it("drains pending evidence independently of display, defers failures and skips superseded versions", async () => {
  await mailEvidenceStore(client).persistEvidence([submission()]);
  await database.exclusive(async (session) => {
    const first = (await session.pending(new Date(briefTime), 10))[0];
    if (!first) throw new Error("fixture");
    await session.defer(first, new Date("2026-10-12T00:00:00Z"));
    expect(await session.pending(new Date(briefTime), 10)).toEqual([]);
    expect(
      (await client.pool.query("select attempts from jev.pending_jobs")).rows[0]?.attempts,
    ).toBe(1);
    const changed = submission();
    changed.jobId = randomUUID();
    const message = changed.evidence.messages[0];
    if (!message) throw new Error("fixture");
    message.subject = "New version";
    changed.observation.observedAt = "2026-10-11T14:00:00.000Z";
    await mailEvidenceStore(client).persistEvidence([changed]);
    const pending = await session.pending(new Date("2026-10-13T00:00:00Z"), 10);
    expect(pending.map((r) => r.jobId)).toEqual([changed.jobId]);
    const current = pending[0];
    if (!current?.conversation) throw new Error("fixture");
    await session.save(current, {
      policy: briefPolicy,
      inputHash: briefInputHash(current.fingerprint, current.conversation.directions),
      decision: { type: "jev", result: triageResponse() },
    });
    expect(await session.pending(new Date("2026-10-13T00:00:00Z"), 10)).toEqual([]);
  });
});
it("preserves lifetime reservations across sessions and refuses overspending", async () => {
  await client.pool.query("delete from jev.inference_budgets");
  await database.exclusive(async (session) => {
    expect(await session.reserveInference()).toBe(true);
  });
  // A process died after admission; its maximum charge remains durable.
  await database.exclusive(async (session) => {
    const before = (await client.pool.query("select used_nano from jev.inference_budgets")).rows[0]
      ?.used_nano;
    expect(before).toBe(10_000_000 + 64_000 * 42);
    expect(await session.reserveInference()).toBe(true);
    await session.settleInference(100);
    await expect(session.settleInference(100)).rejects.toThrow("missing-reservation");
    expect(
      (await client.pool.query("select used_nano from jev.inference_budgets")).rows[0]?.used_nano,
    ).toBe(before + 100 * 42);
    await client.pool.query("update jev.inference_budgets set used_nano=2000000000-100");
    expect(await session.reserveInference()).toBe(false);
    expect(
      (await client.pool.query("select used_nano from jev.inference_budgets")).rows[0]?.used_nano,
    ).toBe(2000000000 - 100);
    await expect(session.settleInference(64_001)).rejects.toThrow("invalid-usage");
  });
});

it("prioritizes fresh jobs and continues beyond a bounded first selection", async () => {
  for (let i = 0; i < 3; i++) {
    const item = submission();
    item.jobId = randomUUID();
    item.evidence.source.threadId = `thread-${i}`;
    item.availableAt = new Date(`2026-10-11T0${i}:00:00.000Z`);
    await mailEvidenceStore(client).persistEvidence([item]);
  }
  await database.exclusive(async (session) => {
    const first = await session.pending(new Date(briefTime), 2);
    expect(first.map((r) => r.sourceId)).toEqual(["thread-2", "thread-1"]);
    for (const record of first) {
      if (!record.conversation) throw new Error("fixture");
      await session.save(record, {
        policy: briefPolicy,
        inputHash: briefInputHash(record.fingerprint, record.conversation.directions),
        decision: { type: "jev", result: triageResponse() },
      });
    }
    expect((await session.pending(new Date(briefTime), 2)).map((r) => r.sourceId)).toEqual([
      "thread-0",
    ]);
  });
});

it("selects only recent classified current evidence for capture and persists terminal review annotations", async () => {
  const { captureDatabase } = await import("../../src/adapters/postgres/automatic-capture.js");
  await mailEvidenceStore(client).persistEvidence([submission()]);
  await database.exclusive(async (session) => {
    const record = (await session.sample(since, until, 1)).records[0];
    if (!record?.conversation) throw new Error("fixture");
    const result = triageResponse();
    result.answers.attention.confidence = 1;
    result.answers.lifecycle.confidence = 1;
    await session.save(record, {
      policy: briefPolicy,
      inputHash: briefInputHash(record.fingerprint, record.conversation.directions),
      decision: { type: "jev", result },
    });
  });
  await captureDatabase(client).exclusive(async (session) => {
    expect(await session.select("2026-10-12T00:00:00.000Z", new Date(briefTime))).toEqual([]);
    const records = await session.select(since, new Date(briefTime));
    expect(records).toHaveLength(1);
    const record = records[0];
    if (!record) throw new Error("fixture");
    const retryAt = new Date(Date.parse(briefTime) + 3_600_000);
    await session.record(record, "failed", retryAt);
    expect(await session.select(since, new Date(briefTime))).toEqual([]);
    expect(await session.select(since, retryAt)).toHaveLength(1);
    await session.record(record, "review", null);
    expect(await session.select(since, new Date(briefTime))).toEqual([]);
  });
  await database.exclusive(async (session) => {
    expect((await session.sample(since, until, 1)).records[0]?.capture).toEqual({
      state: "review",
    });
  });
});
it("keeps durable links across edited/completed/deleted remote work and caps ambiguous creation admissions at three", async () => {
  const { captureDatabase } = await import("../../src/adapters/postgres/automatic-capture.js");
  const { taskReview } = await import("../fixtures/email-task.js");
  await mailEvidenceStore(client).persistEvidence([submission()]);
  await captureDatabase(client).exclusive(async (session) => {
    const first = taskReview().candidates[0];
    if (!first) throw new Error("fixture");
    await session.link(first.sourceId, "user-edited-or-completed-task");
    expect(
      (
        await client.pool.query("select overrides from jev.task_links where source_id=$1", [
          first.sourceId,
        ])
      ).rows[0]?.overrides,
    ).toEqual({ workerOwned: false, preserveAllFields: true });
    await expect(session.link(first.sourceId, "another-task")).rejects.toThrow("mapping-changed");
    expect(await session.reserve(first, 3)).toEqual({
      status: "linked",
      taskId: "user-edited-or-completed-task",
    });
    for (let i = 0; i < 3; i++)
      expect(await session.reserve({ ...first, sourceId: `new-${i}` }, 3)).toMatchObject({
        status: "ready",
      });
    expect(await session.reserve({ ...first, sourceId: "fourth" }, 3)).toEqual({
      status: "capped",
    });
    expect(
      (
        await client.pool.query(
          "select count(*)::int n from jev.write_intents where destination='todoist' and state='ambiguous'",
        )
      ).rows[0]?.n,
    ).toBe(3);
    expect(await captureDatabase(client).exclusive(async () => "unexpected")).toBeUndefined();
  });
});
