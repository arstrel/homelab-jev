import { and, eq, isNull, sql } from "drizzle-orm";
import type { EvidenceStore } from "../../application/ports.js";
import { snapshotSubmission, storedEvidence } from "../../domain/stored-mail-evidence.js";
import type { connect } from "./client.js";
import * as s from "./schema.js";

export function mailEvidenceStore(client: ReturnType<typeof connect>): EvidenceStore {
  return {
    async persistEvidence(records) {
      // Snapshot before awaiting; no network calls or caller-owned objects in the transaction.
      const values = records.map(snapshotSubmission).sort((a, b) => {
        const left = JSON.stringify([
          a.evidence.source.mailbox,
          a.evidence.source.threadId,
          a.fingerprint,
        ]);
        const right = JSON.stringify([
          b.evidence.source.mailbox,
          b.evidence.source.threadId,
          b.fingerprint,
        ]);
        return left < right ? -1 : left > right ? 1 : 0;
      });
      if (!values.length) return { newVersions: 0, newJobs: 0, boundLegacyJobs: 0 };
      return client.db.transaction(async (tx) => {
        const counts = { newVersions: 0, newJobs: 0, boundLegacyJobs: 0 };
        for (const value of values) {
          const source = {
            mailbox: value.evidence.source.mailbox,
            sourceId: value.evidence.source.threadId,
          };
          await tx
            .insert(s.sources)
            .values({
              ...source,
              fingerprint: value.fingerprint,
              observedAt: new Date(value.observation.observedAt),
              observation: value.observation,
            })
            .onConflictDoUpdate({
              target: [s.sources.mailbox, s.sources.sourceId],
              set: {
                fingerprint: value.fingerprint,
                observedAt: new Date(value.observation.observedAt),
                observation: value.observation,
              },
              setWhere: sql`${s.sources.observedAt} <= ${new Date(value.observation.observedAt)}`,
            });
          const versions = await tx
            .insert(s.mailEvidenceVersions)
            .values({
              ...source,
              fingerprint: value.fingerprint,
              schemaVersion: value.evidence.schemaVersion,
              evidence: value.evidence,
              createdAt: value.availableAt,
            })
            .onConflictDoNothing()
            .returning({ fingerprint: s.mailEvidenceVersions.fingerprint });
          counts.newVersions += versions.length;
          const jobs = await tx
            .insert(s.pendingJobs)
            .values({
              ...source,
              id: value.jobId,
              fingerprint: value.fingerprint,
              evidenceFingerprint: value.fingerprint,
              policyVersion: value.policyVersion,
              availableAt: value.availableAt,
            })
            .onConflictDoNothing({
              target: [
                s.pendingJobs.mailbox,
                s.pendingJobs.sourceId,
                s.pendingJobs.fingerprint,
                s.pendingJobs.policyVersion,
              ],
            })
            .returning({ id: s.pendingJobs.id });
          counts.newJobs += jobs.length;
          if (!jobs.length) {
            const bound = await tx
              .update(s.pendingJobs)
              .set({ evidenceFingerprint: value.fingerprint })
              .where(
                and(
                  eq(s.pendingJobs.mailbox, source.mailbox),
                  eq(s.pendingJobs.sourceId, source.sourceId),
                  eq(s.pendingJobs.fingerprint, value.fingerprint),
                  eq(s.pendingJobs.policyVersion, value.policyVersion),
                  isNull(s.pendingJobs.evidenceFingerprint),
                ),
              )
              .returning({ id: s.pendingJobs.id });
            counts.boundLegacyJobs += bound.length;
          }
        }
        return counts;
      });
    },
    async evidenceForJob(jobId) {
      const [row] = await client.db
        .select({
          mailbox: s.pendingJobs.mailbox,
          sourceId: s.pendingJobs.sourceId,
          fingerprint: s.pendingJobs.fingerprint,
          evidence: s.mailEvidenceVersions.evidence,
        })
        .from(s.pendingJobs)
        .leftJoin(
          s.mailEvidenceVersions,
          and(
            eq(s.pendingJobs.mailbox, s.mailEvidenceVersions.mailbox),
            eq(s.pendingJobs.sourceId, s.mailEvidenceVersions.sourceId),
            eq(s.pendingJobs.evidenceFingerprint, s.mailEvidenceVersions.fingerprint),
          ),
        )
        .where(eq(s.pendingJobs.id, jobId));
      if (!row) return { status: "missing-job" };
      if (!row.evidence) return { status: "missing-evidence" };
      return { status: "ready", evidence: storedEvidence(row.evidence, row) };
    },
  };
}
