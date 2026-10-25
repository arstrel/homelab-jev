import { randomUUID } from "node:crypto";
import type { CaptureSession } from "../../application/capture-mail.js";
import { capturePolicy } from "../../domain/automatic-capture.js";
import { briefModel, briefPolicy } from "../../domain/email-brief.js";
import { emailTaskKey } from "../../domain/email-task.js";
import type { connect } from "./client.js";
import { emailTaskWriter } from "./email-tasks.js";

export function captureDatabase(client: ReturnType<typeof connect>) {
  return {
    async exclusive<T>(run: (session: CaptureSession) => Promise<T>) {
      const connection = await client.pool.connect();
      const onError = () => {};
      connection.on("error", onError);
      try {
        const lock = await connection.query(
          "select pg_try_advisory_lock(hashtextextended('jev:reviewed-email-tasks',0)) held",
        );
        if (!lock.rows[0]?.held) return undefined;
        const writer = emailTaskWriter(connection);
        return await run({
          ...writer,
          async select(since, until) {
            const { rows } = await connection.query<{
              source_id: string;
              job_id: string;
              fingerprint: string;
              saved: unknown;
            }>(
              `
              select s.source_id,j.id job_id,s.fingerprint,c.result saved from jev.sources s
              join jev.pending_jobs j on j.mailbox=s.mailbox and j.source_id=s.source_id and j.evidence_fingerprint=s.fingerprint
              join jev.mail_evidence_versions v on v.mailbox=s.mailbox and v.source_id=s.source_id and v.fingerprint=s.fingerprint
              join lateral (select result from jev.classifications where job_id=j.id and model_version=$4 and result->>'policy'=$3 order by created_at desc,id desc limit 1) c on true
              cross join lateral (select max((m->>'receivedAt')::timestamptz) received from jsonb_array_elements(v.evidence->'messages') m) latest
              left join lateral (select result from jev.classifications where job_id=j.id and result->>'policy'=$5 order by created_at desc,id desc limit 1) prior on true
              where s.mailbox='primary' and latest.received >= $1::timestamptz and latest.received <= $2
              and c.result->'decision'->'result'->'answers'->'attention'->>'choice'='action'
              and c.result->'decision'->'result'->'answers'->'lifecycle'->>'choice'='request'
              and not exists(select 1 from jev.task_links l where l.mailbox=s.mailbox and l.source_id=s.source_id)
              and not exists(select 1 from jev.write_intents i where i.destination='todoist' and i.state='ambiguous' and i.outcome->>'sourceId'=s.source_id)
              and (prior.result is null or (prior.result->>'nextAt' is not null and (prior.result->>'nextAt')::timestamptz <= $2))
              order by latest.received desc,s.source_id limit 5`,
              [since, until, briefPolicy, briefModel, capturePolicy],
            );
            return Promise.all(
              rows.map(async (row) => {
                const conversation = await writer.current(row.source_id);
                return {
                  sourceId: row.source_id,
                  jobId: row.job_id,
                  fingerprint: row.fingerprint,
                  saved: row.saved,
                  ...(conversation ? { conversation } : {}),
                };
              }),
            );
          },
          async record(record, state, nextAt, decision) {
            await connection.query(
              "insert into jev.classifications (id,job_id,model_version,result,created_at) values ($1,$2,$3,$4,clock_timestamp())",
              [
                randomUUID(),
                record.jobId,
                briefModel,
                {
                  policy: capturePolicy,
                  state,
                  nextAt: nextAt?.toISOString() ?? null,
                  ...(decision ? { decision } : {}),
                },
              ],
            );
          },
          async link(sourceId, taskId) {
            const existing = await connection.query<{ task_id: string }>(
              "select task_id from jev.task_links where mailbox='primary' and source_id=$1 limit 1",
              [sourceId],
            );
            if (existing.rows[0]) {
              if (existing.rows[0].task_id !== taskId) throw new Error("mapping-changed");
              return;
            }
            const key = emailTaskKey(sourceId);
            await connection.query(
              // An association with an existing user task never grants ownership.
              "insert into jev.task_links (mailbox,source_id,obligation_key,task_id,overrides) values ('primary',$1,$2,$3,'{\"workerOwned\":false,\"preserveAllFields\":true}'::jsonb) on conflict do nothing",
              [sourceId, key, taskId],
            );
          },
        });
      } finally {
        connection.removeListener("error", onError);
        connection.release(true);
      }
    },
  };
}
