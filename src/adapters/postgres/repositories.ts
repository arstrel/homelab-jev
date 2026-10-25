import { count, eq } from "drizzle-orm";
import type { Ledger } from "../../application/ports.js";
import type { connect } from "./client.js";
import * as s from "./schema.js";

export function repositories(client: ReturnType<typeof connect>) {
  const db = client.db;
  return {
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
  } satisfies Ledger;
}
