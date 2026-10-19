import { z } from "zod";
import type { TriageEvidenceReader } from "../../application/ports.js";
import { storedEvidence } from "../../domain/stored-mail-evidence.js";
import type { connect } from "./client.js";

const observation = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      direction: z.enum(["incoming", "sent", "unknown"]),
    }),
  ),
});
export function triageEvidenceReader(client: ReturnType<typeof connect>): TriageEvidenceReader {
  return {
    async pending(limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20)
        throw new Error("Invalid triage limit");
      const connection = await client.pool.connect();
      try {
        await connection.query("begin isolation level repeatable read read only");
        const { rows } = await connection.query<{
          mailbox: string;
          sourceId: string;
          fingerprint: string;
          evidence: unknown;
          observation: unknown;
        }>(
          `select j.mailbox, j.source_id as "sourceId", j.fingerprint,
          v.evidence, s.observation from jev.pending_jobs j
          left join jev.mail_evidence_versions v on
            v.mailbox = j.mailbox and v.source_id = j.source_id and v.fingerprint = j.evidence_fingerprint
          join jev.sources s on s.mailbox = j.mailbox and s.source_id = j.source_id
          where j.mailbox = 'primary' and j.state = 'pending'
          order by j.available_at, j.id limit $1`,
          [limit],
        );
        const result = rows.map((row) => {
          if (!row.evidence) return { status: "missing-evidence" as const };
          try {
            const evidence = storedEvidence(row.evidence, row);
            const hints = observation.safeParse(row.observation);
            const byId = new Map(
              hints.success ? hints.data.messages.map((m) => [m.id, m.direction]) : [],
            );
            return {
              status: "ready" as const,
              evidence,
              directions: evidence.messages.map((m) => byId.get(m.id) ?? ("unknown" as const)),
            };
          } catch {
            return { status: "invalid-evidence" as const };
          }
        });
        await connection.query("commit");
        return result;
      } catch (error) {
        await connection.query("rollback").catch(() => {});
        throw error;
      } finally {
        connection.release();
      }
    },
  };
}
