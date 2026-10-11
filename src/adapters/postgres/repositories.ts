import { count, eq, ne } from "drizzle-orm";
import type { Ledger } from "../../application/ports.js";
import type { connect } from "./client.js";
import * as s from "./schema.js";

export function repositories(client: ReturnType<typeof connect>) {
  const db = client.db;
  return {
    async ingest(input: {
      checkpoint: typeof s.checkpoints.$inferInsert;
      sources: (typeof s.sources.$inferInsert)[];
      jobs: (typeof s.pendingJobs.$inferInsert)[];
    }) {
      // Ingestion and checkpoint advancement share one transaction. Remote requests stay outside it.
      await db.transaction(async (tx) => {
        for (const source of input.sources)
          await tx
            .insert(s.sources)
            .values(source)
            .onConflictDoUpdate({
              target: [s.sources.mailbox, s.sources.sourceId],
              set: { fingerprint: source.fingerprint, observedAt: source.observedAt },
            });
        for (const job of input.jobs)
          await tx
            .insert(s.pendingJobs)
            .values(job)
            .onConflictDoNothing({
              target: [
                s.pendingJobs.mailbox,
                s.pendingJobs.sourceId,
                s.pendingJobs.fingerprint,
                s.pendingJobs.policyVersion,
              ],
            });
        await tx
          .insert(s.checkpoints)
          .values(input.checkpoint)
          .onConflictDoUpdate({
            target: s.checkpoints.mailbox,
            set: { historyId: input.checkpoint.historyId, syncedAt: input.checkpoint.syncedAt },
          });
      });
    },
    async checkpoint(mailbox: string) {
      return (await db.select().from(s.checkpoints).where(eq(s.checkpoints.mailbox, mailbox)))[0];
    },
    async pending() {
      return db.select().from(s.pendingJobs).where(eq(s.pendingJobs.state, "pending"));
    },
    async classify(value: typeof s.classifications.$inferInsert) {
      await db.insert(s.classifications).values(value);
    },
    async link(value: typeof s.taskLinks.$inferInsert) {
      await db.insert(s.taskLinks).values(value);
    },
    async suppress(value: typeof s.suppressions.$inferInsert) {
      await db.insert(s.suppressions).values(value).onConflictDoNothing();
    },
    async suppressed(key: string) {
      return (
        (await db.select().from(s.suppressions).where(eq(s.suppressions.obligationKey, key)))
          .length > 0
      );
    },
    async intent(value: typeof s.writeIntents.$inferInsert) {
      await db.insert(s.writeIntents).values(value);
    },
    async settle(id: string, state: "ambiguous" | "complete", outcome: Record<string, unknown>) {
      await db.update(s.writeIntents).set({ state, outcome }).where(eq(s.writeIntents.id, id));
    },
    async unresolvedIntents() {
      return db.select().from(s.writeIntents).where(ne(s.writeIntents.state, "complete"));
    },
    async status() {
      const [checkpoints, pending, intents] = await Promise.all([
        db.select({ n: count() }).from(s.checkpoints),
        db.select({ n: count() }).from(s.pendingJobs).where(eq(s.pendingJobs.state, "pending")),
        db.select({ n: count() }).from(s.writeIntents),
      ]);
      return {
        checkpoints: checkpoints[0]?.n ?? 0,
        pendingJobs: pending[0]?.n ?? 0,
        writeIntents: intents[0]?.n ?? 0,
      };
    },
  } satisfies Ledger & Record<string, unknown>;
}
