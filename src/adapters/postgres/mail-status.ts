import { fileURLToPath } from "node:url";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getTableConfig } from "drizzle-orm/pg-core";
import type { PoolClient } from "pg";
import type { MailStatusReader } from "../../application/ports.js";
import {
  type MailStatusSnapshot,
  retrievalFailureNames,
  unavailableMeasurements,
} from "../../domain/mail-status.js";
import type { connect } from "./client.js";
import * as s from "./schema.js";

const requiredTables = [
  s.checkpoints,
  s.inferenceBudgets,
  s.classifications,
  s.mailEvidenceVersions,
  s.mailRecoveryTargets,
  s.mailRetrievals,
  s.mailSyncState,
  s.pendingJobs,
  s.sources,
  s.suppressions,
  s.taskLinks,
  s.writeIntents,
].map(getTableConfig);

async function readiness(connection: PoolClient): Promise<MailStatusSnapshot["schemaState"]> {
  const expected = readMigrationFiles({
    migrationsFolder: fileURLToPath(new URL("../../../migrations/", import.meta.url)),
  });
  const schemas = await connection.query<{ nspname: string }>(
    "select nspname from pg_catalog.pg_namespace where nspname = any($1::text[])",
    [["jev", "jev_migrations"]],
  );
  const columns = await connection.query<{
    table_schema: string;
    table_name: string;
    column_name: string;
  }>(
    `select n.nspname as table_schema, c.relname as table_name, a.attname as column_name
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = any($1::text[]) and c.relkind in ('r','p')
      and a.attnum > 0 and not a.attisdropped`,
    [["jev", "jev_migrations"]],
  );
  const has = (schema: string, table: string, column: string) =>
    columns.rows.some(
      (row) =>
        row.table_schema === schema && row.table_name === table && row.column_name === column,
    );
  const managedSchema = schemas.rows.some((row) => row.nspname === "jev");
  const journal = columns.rows.some(
    (row) => row.table_schema === "jev_migrations" && row.table_name === "__drizzle_migrations",
  );
  if (!journal) return schemas.rows.length === 0 ? "migration-required" : "incompatible";
  if (
    !["id", "hash", "created_at"].every((column) =>
      has("jev_migrations", "__drizzle_migrations", column),
    )
  )
    return "incompatible";
  const applied = await connection.query<{ hash: string; created_at: string }>(
    "select hash, created_at from jev_migrations.__drizzle_migrations order by id",
  );
  if (
    applied.rows.length > expected.length ||
    applied.rows.some(
      (row, i) =>
        row.hash !== expected[i]?.hash || Number(row.created_at) !== expected[i]?.folderMillis,
    )
  )
    return "incompatible";
  if (applied.rows.length === 0) return managedSchema ? "incompatible" : "migration-required";
  if (!managedSchema) return "incompatible";
  if (applied.rows.length < expected.length) return "migration-required";
  if (
    !requiredTables.every((table) =>
      table.columns.every((column) => has("jev", table.name, column.name)),
    )
  )
    return "incompatible";
  return "ready";
}
const instant = (value: Date | null) => value?.toISOString() ?? null;

/** No advisory ownership or provider access: all measurements share one read-only snapshot. */
export function mailStatusReader(
  client: Pick<ReturnType<typeof connect>, "pool">,
): MailStatusReader {
  return {
    async read(now) {
      const connection = await client.pool.connect();
      let lost = false;
      const onError = () => {
        lost = true;
      };
      connection.on("error", onError);
      const commit = async () => {
        await connection.query("commit");
        if (lost) throw new Error("Database observation interrupted");
      };
      try {
        await connection.query("begin isolation level repeatable read read only");
        const schemaState = await readiness(connection);
        if (schemaState !== "ready") {
          await commit();
          return unavailableMeasurements(schemaState);
        }
        const {
          rows: [state],
        } = await connection.query<{
          phase: Exclude<MailStatusSnapshot["phase"], "uninitialized" | null>;
          days: number;
          window_since: Date;
          window_until: Date;
          discovery_checked_at: Date | null;
          evidence_synced_at: Date | null;
          recovery_count: number;
          recovery_started_at: Date | null;
          recovery_completed_at: Date | null;
          history_gap: boolean;
        }>(
          `select phase, days, window_since, window_until, discovery_checked_at, evidence_synced_at,
          recovery_count, recovery_started_at, recovery_completed_at, history_gap
          from jev.mail_sync_state where mailbox = $1`,
          ["primary"],
        );
        const {
          rows: [retrievals],
        } = await connection.query<{
          pending: number;
          due: number;
          retrying: number;
          next_retry_at: Date | null;
        }>(
          `select count(*)::int as pending,
          count(*) filter (where available_at <= $2)::int as due,
          count(*) filter (where attempts > 0)::int as retrying,
          min(available_at) filter (where attempts > 0 and available_at > $2) as next_retry_at
          from jev.mail_retrievals where mailbox = $1`,
          ["primary", now],
        );
        const failures = await connection.query<{
          reason: (typeof retrievalFailureNames)[number];
          n: number;
        }>(
          `select case when failure = any($2::text[]) then failure else 'unknown-failure' end as reason,
          count(*)::int as n from jev.mail_retrievals where mailbox = $1 and failure is not null
          group by 1 order by 1`,
          ["primary", retrievalFailureNames],
        );
        const {
          rows: [jobs],
        } = await connection.query<{ pending: number; unbound: number }>(
          `select count(*)::int as pending,
          count(*) filter (where evidence_fingerprint is null)::int as unbound
          from jev.pending_jobs where mailbox = $1 and state = 'pending'`,
          ["primary"],
        );
        if (!retrievals || !jobs) throw new Error("Missing aggregate");
        const snapshot: MailStatusSnapshot = {
          schemaState: "ready",
          phase: state?.phase ?? "uninitialized",
          window: state
            ? {
                days: state.days,
                since: state.window_since.toISOString(),
                until: state.window_until.toISOString(),
              }
            : null,
          discoveryCheckedAt: instant(state?.discovery_checked_at ?? null),
          evidenceSyncedAt: instant(state?.evidence_synced_at ?? null),
          recovery: state
            ? {
                count: state.recovery_count,
                startedAt: instant(state.recovery_started_at),
                completedAt: instant(state.recovery_completed_at),
                historyGap: state.history_gap,
                scope: state.history_gap ? "recent-window-and-all-mapped-threads" : null,
              }
            : null,
          retrievals: {
            pending: retrievals.pending,
            due: retrievals.due,
            retrying: retrievals.retrying,
            nextRetryAt: instant(retrievals.next_retry_at),
            failures: Object.fromEntries(failures.rows.map((row) => [row.reason, row.n])),
          },
          classification: { pendingJobs: jobs.pending, unboundPendingJobs: jobs.unbound },
        };
        await commit();
        return snapshot;
      } catch (error) {
        await connection.query("rollback").catch(() => {});
        throw error;
      } finally {
        // Destroy to ensure no transaction state survives an uncertain rollback.
        connection.removeListener("error", onError);
        connection.release(true);
      }
    },
  };
}
