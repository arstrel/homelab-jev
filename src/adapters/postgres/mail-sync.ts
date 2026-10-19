import { and, count, eq, gt, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { MailSyncSession, MailSyncStore } from "../../application/ports.js";
import { MailReadError } from "../../domain/mail-evidence.js";
import type { MailSyncState, RetrievalWork } from "../../domain/mail-sync.js";
import type { connect } from "./client.js";
import { persistEvidenceTransaction, snapshotEvidence } from "./mail-evidence.js";
import * as s from "./schema.js";

export function mailSyncStore(client: ReturnType<typeof connect>): MailSyncStore {
  return {
    async exclusive(mailbox, operation) {
      const connection = await client.pool.connect();
      const lost = new AbortController();
      const onError = () => lost.abort(new MailReadError("cancelled"));
      connection.on("error", onError);
      try {
        const lock = await connection.query(
          "select pg_try_advisory_lock(hashtextextended($1, 0)) as held",
          [`jev:mail-sync:${mailbox}`],
        );
        if (!lock.rows[0]?.held) return undefined;
        const db = drizzle(connection, { schema: s });
        const active = () => {
          if (lost.signal.aborted) throw new MailReadError("cancelled");
        };
        const state = async () => {
          active();
          return (
            await db.select().from(s.mailSyncState).where(eq(s.mailSyncState.mailbox, mailbox))
          )[0];
        };
        const workWhere = (work: RetrievalWork) => {
          if (work.mailbox !== mailbox) throw new MailReadError("invalid-data");
          return and(
            eq(s.mailRetrievals.mailbox, mailbox),
            eq(s.mailRetrievals.threadId, work.threadId),
            eq(s.mailRetrievals.generation, work.generation),
          );
        };
        const session: MailSyncSession = {
          signal: lost.signal,
          state,
          async initialize(value) {
            active();
            if (value.mailbox !== mailbox) throw new MailReadError("invalid-data");
            await db.insert(s.mailSyncState).values(value);
          },
          async savePage(previous, next, ids, fromHistory, now) {
            active();
            if (
              previous.mailbox !== mailbox ||
              next.mailbox !== mailbox ||
              next.revision !== previous.revision + 1 ||
              ids.length > 2_000 ||
              ids.some((id) => !id)
            )
              throw new MailReadError("invalid-data");
            await db.transaction(async (tx) => {
              for (const threadId of new Set(ids))
                await tx
                  .insert(s.mailRetrievals)
                  .values({
                    mailbox,
                    threadId,
                    fromHistory: fromHistory ? 1 : 0,
                    availableAt: now,
                  })
                  .onConflictDoUpdate({
                    target: [s.mailRetrievals.mailbox, s.mailRetrievals.threadId],
                    set: {
                      generation: sql`${s.mailRetrievals.generation} + 1`,
                      fromHistory: sql`greatest(${s.mailRetrievals.fromHistory}, ${fromHistory ? 1 : 0})`,
                      availableAt: now,
                      failure: null,
                    },
                  });
              const updated = await tx
                .update(s.mailSyncState)
                .set(next)
                .where(
                  and(
                    eq(s.mailSyncState.mailbox, mailbox),
                    eq(s.mailSyncState.revision, previous.revision),
                  ),
                )
                .returning({ mailbox: s.mailSyncState.mailbox });
              if (!updated.length) throw new MailReadError("invalid-data");
            });
          },
          async due(now, limit) {
            active();
            if (!Number.isInteger(limit) || limit < 1 || limit > 500)
              throw new MailReadError("invalid-data");
            const rows = await db
              .select()
              .from(s.mailRetrievals)
              .where(
                and(eq(s.mailRetrievals.mailbox, mailbox), lte(s.mailRetrievals.availableAt, now)),
              )
              .orderBy(s.mailRetrievals.availableAt, s.mailRetrievals.threadId)
              .limit(limit);
            return rows.map((row) => ({ ...row, fromHistory: row.fromHistory === 1 }));
          },
          async acknowledge(work, evidence) {
            active();
            const where = workWhere(work);
            if (
              evidence &&
              (evidence.evidence.source.mailbox !== mailbox ||
                evidence.evidence.source.threadId !== work.threadId)
            )
              throw new MailReadError("invalid-data");
            const values = snapshotEvidence(evidence ? [evidence] : []);
            return db.transaction(async (tx) => {
              const removed = await tx
                .delete(s.mailRetrievals)
                .where(where)
                .returning({ threadId: s.mailRetrievals.threadId });
              if (!removed.length) throw new MailReadError("invalid-data");
              return persistEvidenceTransaction(tx, values);
            });
          },
          async retry(work, failure, availableAt) {
            active();
            const updated = await db
              .update(s.mailRetrievals)
              .set({ attempts: sql`${s.mailRetrievals.attempts} + 1`, failure, availableAt })
              .where(workWhere(work))
              .returning({ threadId: s.mailRetrievals.threadId });
            if (!updated.length) throw new MailReadError("invalid-data");
          },
          async finish(caughtUp) {
            active();
            const current = await state();
            if (!current) throw new MailReadError("invalid-data");
            const pending =
              (
                await db
                  .select({ n: count() })
                  .from(s.mailRetrievals)
                  .where(eq(s.mailRetrievals.mailbox, mailbox))
              )[0]?.n ?? 0;
            let result: MailSyncState = current;
            if (
              caughtUp &&
              pending === 0 &&
              current.phase === "history" &&
              current.pageToken === null
            ) {
              const [updated] = await db
                .update(s.mailSyncState)
                .set({ evidenceSyncedAt: current.discoveryCheckedAt })
                .where(eq(s.mailSyncState.mailbox, mailbox))
                .returning();
              if (!updated) throw new MailReadError("invalid-data");
              result = updated;
            }
            const retrying =
              (
                await db
                  .select({ n: count() })
                  .from(s.mailRetrievals)
                  .where(
                    and(eq(s.mailRetrievals.mailbox, mailbox), gt(s.mailRetrievals.attempts, 0)),
                  )
              )[0]?.n ?? 0;
            return { pending, retrying, state: result };
          },
        };
        return await operation(session);
      } finally {
        // Destroy this dedicated session: it can never return to the pool holding a lock.
        connection.removeListener("error", onError);
        connection.release(true);
      }
    },
  };
}
