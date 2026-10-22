import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import type { BriefDatabase, BriefRecord, BriefSession } from "../../application/email-brief.js";
import {
  briefDestination,
  briefModel,
  briefPolicy,
  briefPublicationSchema,
} from "../../domain/email-brief.js";
import { storedEvidence } from "../../domain/stored-mail-evidence.js";
import type { connect } from "./client.js";

const observation = z.object({
  messages: z.array(
    z.object({ id: z.string(), direction: z.enum(["incoming", "sent", "unknown"]) }),
  ),
});
function session(connection: PoolClient): BriefSession {
  return {
    async sample(since, until, limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("invalid-limit");
      const { rows } = await connection.query<{
        jobId: string;
        sourceId: string;
        fingerprint: string;
        evidence: unknown;
        observation: unknown;
        saved: unknown;
        eligible: string;
      }>(
        `select j.id as "jobId", s.source_id as "sourceId", s.fingerprint, v.evidence, s.observation, c.result as saved, count(*) over() as eligible
      from jev.sources s
      join jev.mail_evidence_versions v on v.mailbox=s.mailbox and v.source_id=s.source_id and v.fingerprint=s.fingerprint
      join lateral (select id from jev.pending_jobs where mailbox=s.mailbox and source_id=s.source_id and evidence_fingerprint=s.fingerprint order by available_at,id limit 1) j on true
      cross join lateral (select max((m->>'receivedAt')::timestamptz) as received from jsonb_array_elements(v.evidence->'messages') m) latest
      left join lateral (select result from jev.classifications where job_id=j.id and result->>'policy'=$4 and model_version in ($5,'owner-rules/v1') order by created_at desc,id desc limit 1) c on true
      where s.mailbox='primary' and latest.received >= $1::timestamptz and latest.received <= $2::timestamptz
      order by latest.received desc,s.source_id limit $3`,
        [since, until, limit, briefPolicy, briefModel],
      );
      return {
        eligible: Number(rows[0]?.eligible ?? 0),
        records: rows.map((row): BriefRecord => {
          const base = {
            jobId: row.jobId,
            sourceId: row.sourceId,
            fingerprint: row.fingerprint,
            ...(row.saved === null ? {} : { saved: row.saved }),
          };
          try {
            const evidence = storedEvidence(row.evidence, {
              mailbox: "primary",
              sourceId: row.sourceId,
              fingerprint: row.fingerprint,
            });
            const parsed = observation.safeParse(row.observation);
            const directions = new Map(
              parsed.success ? parsed.data.messages.map((m) => [m.id, m.direction]) : [],
            );
            return {
              ...base,
              conversation: {
                evidence,
                directions: evidence.messages.map((m) => directions.get(m.id) ?? "unknown"),
              },
            };
          } catch {
            return base;
          }
        }),
      };
    },
    async save(record, saved) {
      await connection.query("begin");
      try {
        const job = await connection.query(
          `update jev.pending_jobs set state='complete'
          where id=$1 and mailbox='primary' and source_id=$2 and fingerprint=$3 and evidence_fingerprint=$3 returning id`,
          [record.jobId, record.sourceId, record.fingerprint],
        );
        if (job.rowCount !== 1) throw new Error("job-changed");
        await connection.query(
          "insert into jev.classifications (id,job_id,model_version,result,created_at) values ($1,$2,$3,$4,now())",
          [
            randomUUID(),
            record.jobId,
            saved.decision.type === "jev" ? briefModel : "owner-rules/v1",
            saved,
          ],
        );
        await connection.query("commit");
      } catch (error) {
        await connection.query("rollback").catch(() => {});
        throw error;
      }
    },
    async destination() {
      const { rows } = await connection.query<{ outcome: unknown }>(
        "select outcome from jev.write_intents where destination='drive' and obligation_key=$1",
        [briefDestination],
      );
      return rows[0] ? briefPublicationSchema.parse(rows[0].outcome) : undefined;
    },
    async reserve(fileId) {
      const value = briefPublicationSchema.parse({ fileId, lastPublished: null });
      await connection.query(
        `insert into jev.write_intents (id,destination,obligation_key,request_id,state,outcome,created_at)
        values ($1,'drive',$2,$3,'pending',$4,now()) on conflict (obligation_key,destination) do nothing`,
        [randomUUID(), briefDestination, randomUUID(), value],
      );
      const saved = await this.destination();
      if (!saved) throw new Error("missing-destination");
      return saved;
    },
    async publishing() {
      const result = await connection.query(
        "update jev.write_intents set state='ambiguous' where destination='drive' and obligation_key=$1 returning id",
        [briefDestination],
      );
      if (result.rowCount !== 1) throw new Error("missing-destination");
    },
    async published(fileId, generation, publishedAt) {
      const value = briefPublicationSchema.parse({
        fileId,
        lastPublished: { generation, publishedAt },
      });
      const result = await connection.query(
        "update jev.write_intents set state='complete',outcome=$1 where destination='drive' and obligation_key=$2 and outcome->>'fileId'=$3 and state='ambiguous' returning id",
        [value, briefDestination, fileId],
      );
      if (result.rowCount !== 1) throw new Error("destination-changed");
    },
  };
}
export function briefDatabase(client: ReturnType<typeof connect>): BriefDatabase {
  return {
    async exclusive(run) {
      const connection = await client.pool.connect();
      const controller = new AbortController();
      const lost = () => controller.abort();
      connection.on("error", lost);
      try {
        const lock = await connection.query<{ held: boolean }>(
          "select pg_try_advisory_lock(hashtextextended('jev:email-brief:primary',0)) as held",
        );
        if (!lock.rows[0]?.held) return undefined;
        const inner = session(connection);
        // Every operation remains on this dedicated owner session. Connection
        // failure aborts provider work; a destroyed client cannot later commit.
        return await run(inner, controller.signal);
      } finally {
        connection.removeListener("error", lost);
        connection.release(true);
      }
    },
  };
}
