import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import {
  inferenceAllowance,
  type PendingMailSession,
} from "../../application/classify-pending-mail.js";
import type { BriefRecord, BriefSession } from "../../application/email-brief.js";
import { capturePolicy } from "../../domain/automatic-capture.js";
import {
  briefDestination,
  briefModel,
  briefPolicy,
  briefPublicationSchema,
  captureAnnotationSchema,
} from "../../domain/email-brief.js";
import { storedEvidence } from "../../domain/stored-mail-evidence.js";
import type { connect } from "./client.js";

const observation = z.object({
  messages: z.array(
    z.object({ id: z.string(), direction: z.enum(["incoming", "sent", "unknown"]) }),
  ),
});
function briefSession(connection: PoolClient): BriefSession & PendingMailSession {
  let canSettle = false;
  return {
    async pending(now, limit) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw new Error("invalid-limit");
      const { rows } = await connection.query<{ id: string }>(
        `select j.id from jev.pending_jobs j join jev.sources s on s.mailbox=j.mailbox and s.source_id=j.source_id and s.fingerprint=j.evidence_fingerprint
        where j.mailbox='primary' and j.state='pending' and j.available_at <= $1
        order by j.attempts,j.available_at desc,j.id limit $2`,
        [now, limit],
      );
      const selected: BriefRecord[] = [];
      for (const row of rows) {
        const result = await this.sample("1970-01-01T00:00:00.000Z", now.toISOString(), 1, row.id);
        if (result.records[0]) selected.push(result.records[0]);
      }
      return selected;
    },
    async defer(record, until) {
      const result = await connection.query(
        "update jev.pending_jobs set attempts=attempts+1,available_at=$2 where id=$1",
        [record.jobId, until],
      );
      if (result.rowCount !== 1) throw new Error("job-changed");
    },
    async reserveInference() {
      canSettle = false;
      const b = inferenceAllowance;
      await connection.query(
        "insert into jev.inference_budgets (id,limit_nano,used_nano) values ($1,$2,$3) on conflict do nothing",
        [b.id, b.limit, b.previous],
      );
      const result = await connection.query(
        "update jev.inference_budgets set used_nano=used_nano+$2 where id=$1 and limit_nano=$3 and used_nano <= limit_nano-$2 returning id",
        [b.id, b.request, b.limit],
      );
      canSettle = result.rowCount === 1;
      return canSettle;
    },
    async settleInference(inputTokens) {
      if (!Number.isSafeInteger(inputTokens) || inputTokens < 0 || inputTokens > 64_000)
        throw new Error("invalid-usage");
      if (!canSettle) throw new Error("missing-reservation");
      canSettle = false;
      const b = inferenceAllowance;
      const result = await connection.query(
        "update jev.inference_budgets set used_nano=used_nano-$2 where id=$1 and used_nano >= $2",
        [b.id, b.request - inputTokens * b.perToken],
      );
      if (result.rowCount !== 1) throw new Error("budget-changed");
    },
    async sample(since: string, until: string, limit: number, jobId?: string) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("invalid-limit");
      const { rows } = await connection.query<{
        jobId: string;
        sourceId: string;
        fingerprint: string;
        evidence: unknown;
        observation: unknown;
        saved: unknown;
        eligible: string;
        capture_state: string | null;
        capture_task_id: string | null;
      }>(
        `select j.id as "jobId", s.source_id as "sourceId", s.fingerprint, v.evidence, s.observation, c.result as saved, case when exists(select 1 from jev.write_intents i where i.destination='todoist' and i.state='ambiguous' and i.outcome->>'sourceId'=s.source_id) then 'ambiguous' else cap.result->>'state' end as capture_state, (select task_id from jev.task_links l where l.mailbox=s.mailbox and l.source_id=s.source_id order by obligation_key limit 1) as capture_task_id, count(*) over() as eligible
      from jev.sources s
      join jev.mail_evidence_versions v on v.mailbox=s.mailbox and v.source_id=s.source_id and v.fingerprint=s.fingerprint
      join lateral (select id from jev.pending_jobs where mailbox=s.mailbox and source_id=s.source_id and evidence_fingerprint=s.fingerprint and ($6::uuid is null or id=$6::uuid) order by available_at,id limit 1) j on true
      cross join lateral (select max((m->>'receivedAt')::timestamptz) as received from jsonb_array_elements(v.evidence->'messages') m) latest
      left join lateral (select result from jev.classifications where job_id=j.id and result->>'policy'=$4 and model_version in ($5,'owner-rules/v1') order by created_at desc,id desc limit 1) c on true
      left join lateral (select result from jev.classifications where job_id=j.id and result->>'policy'=$7 order by created_at desc,id desc limit 1) cap on true
      where s.mailbox='primary' and ($6::uuid is not null or (latest.received >= $1::timestamptz and latest.received <= $2::timestamptz))
      order by latest.received desc,s.source_id limit $3`,
        [since, until, limit, briefPolicy, briefModel, jobId ?? null, capturePolicy],
      );
      return {
        eligible: Number(rows[0]?.eligible ?? 0),
        records: rows.map((row): BriefRecord => {
          const annotation = captureAnnotationSchema.safeParse({
            state: row.capture_state,
            ...(row.capture_task_id ? { taskId: row.capture_task_id } : {}),
          });
          const base = {
            jobId: row.jobId,
            sourceId: row.sourceId,
            fingerprint: row.fingerprint,
            ...(annotation.success ? { capture: annotation.data } : {}),
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
export function briefDatabase(client: ReturnType<typeof connect>) {
  return {
    async exclusive<T>(
      run: (session: BriefSession & PendingMailSession, signal: AbortSignal) => Promise<T>,
    ): Promise<T | undefined> {
      const connection = await client.pool.connect();
      const controller = new AbortController();
      const lost = () => controller.abort();
      connection.on("error", lost);
      try {
        const lock = await connection.query<{ held: boolean }>(
          "select pg_try_advisory_lock(hashtextextended('jev:email-brief:primary',0)) as held",
        );
        if (!lock.rows[0]?.held) return undefined;
        const inner = briefSession(connection);
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
