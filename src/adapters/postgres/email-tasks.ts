import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import type { EmailTaskDatabase, EmailTaskWriter } from "../../application/email-tasks.js";
import { emailTaskKey, type TaskConversation } from "../../domain/email-task.js";
import { storedEvidence } from "../../domain/stored-mail-evidence.js";
import type { connect } from "./client.js";

const hints = z.object({
  messages: z.array(
    z.object({ id: z.string(), direction: z.enum(["incoming", "sent", "unknown"]) }),
  ),
});
type Row = { sourceId: string; fingerprint: string; evidence: unknown; observation: unknown };
function conversation(row: Row): TaskConversation {
  const evidence = storedEvidence(row.evidence, {
    mailbox: "primary",
    sourceId: row.sourceId,
    fingerprint: row.fingerprint,
  });
  const parsed = hints.safeParse(row.observation);
  const directions = new Map(
    parsed.success ? parsed.data.messages.map((m) => [m.id, m.direction]) : [],
  );
  return { evidence, directions: evidence.messages.map((m) => directions.get(m.id) ?? "unknown") };
}
const sourceQuery = `select s.source_id as "sourceId", s.fingerprint, v.evidence, s.observation
 from jev.sources s join jev.mail_evidence_versions v on v.mailbox=s.mailbox and v.source_id=s.source_id and v.fingerprint=s.fingerprint
 where s.mailbox='primary'`;
function writer(connection: PoolClient): EmailTaskWriter {
  return {
    async current(id) {
      const { rows } = await connection.query<Row>(`${sourceQuery} and s.source_id=$1`, [id]);
      return rows[0] ? conversation(rows[0]) : undefined;
    },
    async reserve(candidate) {
      const linked = await connection.query<{ task_id: string }>(
        "select task_id from jev.task_links where mailbox='primary' and source_id=$1 limit 1",
        [candidate.sourceId],
      );
      if (linked.rows[0]) return { status: "linked", taskId: linked.rows[0].task_id };
      const key = emailTaskKey(candidate.sourceId);
      if (
        (await connection.query("select 1 from jev.suppressions where obligation_key=$1", [key]))
          .rowCount
      )
        return { status: "suppressed" };
      const requestId = randomUUID();
      const inserted = await connection.query(
        `insert into jev.write_intents (id,destination,obligation_key,request_id,state,outcome,created_at)
        values ($1,'todoist',$2,$3,'ambiguous',$4,now()) on conflict (obligation_key,destination) do nothing returning id`,
        [randomUUID(), key, requestId, candidate],
      );
      return inserted.rowCount ? { status: "ready", requestId } : { status: "ambiguous" };
    },
    async complete(candidate, requestId, taskId) {
      await connection.query("begin");
      try {
        await connection.query(
          "insert into jev.task_links (mailbox,source_id,obligation_key,task_id) values ('primary',$1,$2,$3)",
          [candidate.sourceId, emailTaskKey(candidate.sourceId), taskId],
        );
        const updated = await connection.query(
          "update jev.write_intents set state='complete',outcome=$1 where destination='todoist' and obligation_key=$2 and request_id=$3 and state='ambiguous'",
          [{ ...candidate, taskId }, emailTaskKey(candidate.sourceId), requestId],
        );
        if (updated.rowCount !== 1) throw new Error("intent-changed");
        await connection.query("commit");
      } catch (error) {
        await connection.query("rollback");
        throw error;
      }
    },
  };
}
async function sample(pool: Pool, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10_000)
    throw new Error("invalid-offset");
  const { rows } = await pool.query<Row>(
    `${sourceQuery}
   and not exists (select 1 from jev.task_links l where l.mailbox=s.mailbox and l.source_id=s.source_id)
   order by (select max((m->>'receivedAt')::timestamptz)
     from jsonb_array_elements(v.evidence->'messages') m) desc nulls last,
     s.source_id limit 10 offset $1`,
    [offset],
  );
  return rows.map(conversation);
}
export function emailTaskDatabase(client: ReturnType<typeof connect>): EmailTaskDatabase {
  return {
    sample: (offset) => sample(client.pool, offset),
    async exclusive(run) {
      const connection = await client.pool.connect();
      const onError = () => {}; // Driver operations reject; prevent an unhandled ownership-loss event.
      connection.on("error", onError);
      try {
        const lock = await connection.query(
          "select pg_try_advisory_lock(hashtextextended('jev:reviewed-email-tasks',0)) as held",
        );
        if (!lock.rows[0]?.held) return undefined;
        return await run(writer(connection));
      } finally {
        connection.removeListener("error", onError);
        connection.release(true); // Destroying the dedicated session also releases its advisory lock.
      }
    },
    close: () => client.close(),
  };
}
