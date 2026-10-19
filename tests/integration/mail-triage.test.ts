import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { triageEvidenceReader } from "../../src/adapters/postgres/mail-triage.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { submission } from "../fixtures/ingestion.js";

const client = connect(testDatabaseUrl(process.env));
const reader = triageEvidenceReader(client);
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
it("selects bounded stable historical evidence and direction hints without changing jobs or results", async () => {
  const old = submission();
  old.jobId = "10000000-0000-4000-8000-000000000001";
  await mailEvidenceStore(client).persistEvidence([old]);
  const next = submission();
  next.jobId = "10000000-0000-4000-8000-000000000002";
  const m = next.evidence.messages[0];
  if (!m) throw new Error("Missing fixture");
  m.subject = "Changed subject";
  next.observation.observedAt = "2026-10-13T00:00:00.000Z";
  await mailEvidenceStore(client).persistEvidence([next]);
  const before = await client.pool.query("select * from jev.pending_jobs order by id");
  expect(await reader.pending(1)).toEqual([
    { status: "ready", evidence: old.evidence, directions: ["incoming", "sent"] },
  ]);
  const rows = await reader.pending(2);
  expect(rows).toHaveLength(2);
  expect(rows[1]).toMatchObject({ evidence: next.evidence });
  expect((await client.pool.query("select * from jev.pending_jobs order by id")).rows).toEqual(
    before.rows,
  );
  expect(
    (await client.pool.query("select count(*)::int as n from jev.classifications")).rows[0]?.n,
  ).toBe(0);
  await expect(reader.pending(21)).rejects.toThrow("Invalid triage limit");
});
it("reports legacy missing evidence and corrupt identity without substituting a newer version", async () => {
  const value = submission();
  await mailEvidenceStore(client).persistEvidence([value]);
  await client.pool.query("update jev.pending_jobs set evidence_fingerprint=null where id=$1", [
    value.jobId,
  ]);
  expect(await reader.pending(1)).toEqual([{ status: "missing-evidence" }]);
  await client.pool.query(
    "update jev.pending_jobs set evidence_fingerprint=fingerprint where id=$1",
    [value.jobId],
  );
  // Mutate only the disposable fixture to exercise defense against stored corruption.
  await client.pool.query(
    "alter table jev.mail_evidence_versions disable trigger mail_evidence_immutable",
  );
  try {
    await client.pool.query(
      "update jev.mail_evidence_versions set evidence=jsonb_set(evidence,'{messages,0,subject}','\"corrupt\"')",
    );
  } finally {
    await client.pool.query(
      "alter table jev.mail_evidence_versions enable trigger mail_evidence_immutable",
    );
  }
  expect(await reader.pending(1)).toEqual([{ status: "invalid-evidence" }]);
});
it("does not select completed work or another mailbox and handles missing observation hints", async () => {
  const value = submission();
  await mailEvidenceStore(client).persistEvidence([value]);
  await client.pool.query("update jev.sources set observation=null");
  expect(await reader.pending(1)).toMatchObject([{ directions: ["unknown", "unknown"] }]);
  await client.pool.query("update jev.pending_jobs set state='complete'");
  expect(await reader.pending(1)).toEqual([]);
  const another = submission();
  another.jobId = randomUUID();
  another.evidence.source.mailbox = "another";
  await mailEvidenceStore(client).persistEvidence([another]);
  expect(await reader.pending(20)).toEqual([]);
});
