import { randomUUID } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { PoolClient } from "pg";
import { afterAll, beforeEach, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { mailEvidenceStore } from "../../src/adapters/postgres/mail-evidence.js";
import { mailStatusReader } from "../../src/adapters/postgres/mail-status.js";
import { mailSyncStore } from "../../src/adapters/postgres/mail-sync.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { pendingJobs } from "../../src/adapters/postgres/schema.js";
import { mailStatus } from "../../src/application/mail-status.js";
import { submission } from "../fixtures/ingestion.js";
import { mailInstant } from "../fixtures/mail.js";
import { syncState } from "../fixtures/sync.js";

const client = connect(testDatabaseUrl(process.env));
const reader = mailStatusReader(client);
const clock = { now: () => new Date(mailInstant) };
async function reset() {
  // Only the test harness's validated disposable database, never the operational target.
  await client.pool.query("drop schema if exists jev cascade");
  await client.pool.query("drop schema if exists jev_migrations cascade");
}
beforeEach(reset);
afterAll(async () => {
  await reset();
  await applyMigrations(client);
  await client.close();
});
async function initialize() {
  await applyMigrations(client);
  await mailSyncStore(client).exclusive("primary", async (session) => {
    await session.initialize(syncState());
  });
}
// Wrap the actual driver to inspect transaction settings or make a concurrent commit between reads.
function afterQuery(callback: (text: string, connection: PoolClient) => Promise<void>) {
  return mailStatusReader({
    pool: new Proxy(client.pool, {
      get(target, property) {
        if (property !== "connect") return Reflect.get(target, property);
        return async () => {
          const connection = await target.connect();
          return new Proxy(connection, {
            get(target, property) {
              if (property === "query")
                return async (text: string, values?: unknown[]) => {
                  const result = await target.query(text, values);
                  await callback(text, target);
                  return result;
                };
              const value = Reflect.get(target, property);
              return typeof value === "function" ? value.bind(target) : value;
            },
          });
        };
      },
    }),
  });
}
it("reports a fresh target without creating either schema or a migration journal", async () => {
  expect(await mailStatus(reader, clock)).toMatchObject({
    schemaState: "migration-required",
    phase: null,
    retrievals: null,
    exitCode: 2,
  });
  expect(
    (
      await client.pool.query(
        "select nspname from pg_namespace where nspname in ('jev', 'jev_migrations')",
      )
    ).rows,
  ).toEqual([]);
});
it("recognizes a valid prior migration prefix without applying the missing migration", async () => {
  const folder = mkdtempSync(join(tmpdir(), "jev-status-prior-"));
  try {
    cpSync("migrations", folder, { recursive: true });
    const path = join(folder, "meta/_journal.json");
    const journal = JSON.parse(readFileSync(path, "utf8"));
    journal.entries = journal.entries.slice(0, 4);
    writeFileSync(path, JSON.stringify(journal));
    await migrate(client.db, { migrationsFolder: folder, migrationsSchema: "jev_migrations" });
    expect(await mailStatus(reader, clock)).toMatchObject({
      schemaState: "migration-required",
      exitCode: 2,
    });
    expect(
      (
        await client.pool.query(
          "select count(*)::int as n from jev_migrations.__drizzle_migrations",
        )
      ).rows[0]?.n,
    ).toBe(4);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
it("recognizes ready but uninitialized storage and existing unbound classification jobs", async () => {
  await applyMigrations(client);
  const input = submission();
  await mailEvidenceStore(client).persistEvidence([input]);
  await client.db.insert(pendingJobs).values({
    id: randomUUID(),
    mailbox: "primary",
    sourceId: "t-boiler",
    fingerprint: "old",
    policyVersion: "legacy",
    availableAt: mailInstant,
  });
  expect(await mailStatus(reader, clock)).toMatchObject({
    schemaState: "ready",
    phase: "uninitialized",
    window: null,
    evidenceSyncedAt: null,
    retrievals: { pending: 0, due: 0, retrying: 0, failures: {} },
    classification: { pendingJobs: 2, unboundPendingJobs: 1 },
    exitCode: 0,
  });
});
it("rejects unmanaged, conflicting, newer and structurally incomplete storage without repair", async () => {
  await client.pool.query("create schema jev");
  expect(await mailStatus(reader, clock)).toMatchObject({
    schemaState: "incompatible",
    exitCode: 1,
  });
  await reset();
  await applyMigrations(client);
  await client.pool.query(
    "update jev_migrations.__drizzle_migrations set hash = 'private-journal-text' where id = 1",
  );
  expect(await mailStatus(reader, clock)).toMatchObject({ schemaState: "incompatible" });
  await reset();
  await applyMigrations(client);
  await client.pool.query(
    "insert into jev_migrations.__drizzle_migrations (hash,created_at) values ('future',9999999999999)",
  );
  expect(await mailStatus(reader, clock)).toMatchObject({ schemaState: "incompatible" });
  expect(
    (await client.pool.query("select count(*)::int as n from jev_migrations.__drizzle_migrations"))
      .rows[0]?.n,
  ).toBe(6);
  await reset();
  await applyMigrations(client);
  await client.pool.query("alter table jev.mail_sync_state drop column recovery_started_at");
  expect(await mailStatus(reader, clock)).toMatchObject({
    schemaState: "incompatible",
    phase: null,
  });
});
it("aggregates due/backoff/failure states independently of classification and preserves every row", async () => {
  await initialize();
  await client.pool.query(
    "update jev.mail_sync_state set discovery_checked_at = $1, history_gap = true, recovery_count = 1, recovery_started_at = $1",
    [mailInstant],
  );
  const future = new Date(mailInstant.getTime() + 300_000);
  await client.pool.query(
    `insert into jev.mail_retrievals (mailbox,thread_id,available_at,attempts,failure) values
    ('primary','due',$1,0,null), ('primary','retry-due',$1,1,'provider-error'),
    ('primary','future',$2,2,'partial-body'), ('primary','unknown',$2,1,'private-failure-text')`,
    [mailInstant, future],
  );
  await mailEvidenceStore(client).persistEvidence([submission()]);
  const rows = async () =>
    Promise.all(
      [
        "mail_sync_state",
        "mail_retrievals",
        "sources",
        "mail_evidence_versions",
        "pending_jobs",
      ].map(
        async (table) =>
          (
            await client.pool.query(
              `select to_jsonb(t) as value from jev.${table} t order by to_jsonb(t)::text`,
            )
          ).rows,
      ),
    );
  const before = await rows();
  const journal = (
    await client.pool.query("select * from jev_migrations.__drizzle_migrations order by id")
  ).rows;
  const report = await mailStatus(reader, clock);
  expect(report).toMatchObject({
    schemaState: "ready",
    phase: "history",
    discoveryCheckedAt: mailInstant.toISOString(),
    evidenceSyncedAt: null,
    recovery: {
      count: 1,
      historyGap: true,
      completedAt: null,
      scope: "recent-window-and-all-mapped-threads",
    },
    retrievals: {
      pending: 4,
      due: 2,
      retrying: 3,
      nextRetryAt: future.toISOString(),
      failures: { "provider-error": 1, "partial-body": 1, "unknown-failure": 1 },
    },
    classification: { pendingJobs: 1, unboundPendingJobs: 0 },
    exitCode: 0,
  });
  expect(JSON.stringify(report)).not.toMatch(
    /private-failure-text|t-boiler|thread_id|fingerprint|example.com/,
  );
  expect(await rows()).toEqual(before);
  expect(
    (await client.pool.query("select * from jev_migrations.__drizzle_migrations order by id")).rows,
  ).toEqual(journal);
});
it("enforces read-only repeatable-read settings even when the DB user can normally write", async () => {
  await initialize();
  let inspected = false;
  const observed = afterQuery(async (text, connection) => {
    if (!text.startsWith("begin")) return;
    inspected = true;
    expect(
      (await connection.query("show transaction_read_only")).rows[0]?.transaction_read_only,
    ).toBe("on");
    expect(
      (await connection.query("show transaction_isolation")).rows[0]?.transaction_isolation,
    ).toBe("repeatable read");
    await connection.query("savepoint write_probe");
    await expect(
      connection.query("insert into jev.checkpoints values ('must-not-write','1',now())"),
    ).rejects.toMatchObject({ code: "25006" });
    await connection.query("rollback to savepoint write_probe");
  });
  expect(await mailStatus(observed, clock)).toMatchObject({ schemaState: "ready" });
  expect(inspected).toBe(true);
  expect(
    (await client.pool.query("select count(*)::int as n from jev.checkpoints")).rows[0]?.n,
  ).toBe(0);
});
it("does not acquire the sync lock and retains a coherent snapshot across a concurrent commit", async () => {
  await initialize();
  let committed = false;
  const observed = afterQuery(async (text) => {
    if (!text.includes("from jev.mail_sync_state") || committed) return;
    committed = true;
    await client.pool.query(
      "insert into jev.mail_retrievals (mailbox,thread_id,available_at) values ('primary','concurrent',$1)",
      [mailInstant],
    );
  });
  await mailSyncStore(client).exclusive("primary", async () => {
    expect(await mailStatus(observed, clock)).toMatchObject({
      schemaState: "ready",
      phase: "history",
      retrievals: { pending: 0 },
    });
  });
  expect(committed).toBe(true);
  expect(await mailStatus(reader, clock)).toMatchObject({ retrievals: { pending: 1 } });
});

it("returns sanitized unavailable measurements after the observing backend is lost", async () => {
  await initialize();
  const interrupted = afterQuery(async (text, connection) => {
    if (!text.includes("from jev.mail_sync_state")) return;
    const {
      rows: [backend],
    } = await connection.query("select pg_backend_pid() as pid");
    const lost = new Promise<void>((resolve) => connection.once("error", () => resolve()));
    await client.pool.query("select pg_terminate_backend($1)", [backend.pid]);
    await lost;
  });
  expect(await mailStatus(interrupted, clock)).toMatchObject({
    schemaState: "unavailable",
    reason: "database-unavailable",
    phase: null,
    retrievals: null,
    exitCode: 1,
  });
  expect(await mailStatus(reader, clock)).toMatchObject({ schemaState: "ready", phase: "history" });
});

it("distinguishes missing SELECT permission from an incompatible schema", async () => {
  await initialize();
  await client.pool.query("create role jev_status_no_select");
  try {
    await client.pool.query("grant usage on schema jev, jev_migrations to jev_status_no_select");
    const restricted = afterQuery(async (text, connection) => {
      if (text.startsWith("begin")) await connection.query("set local role jev_status_no_select");
    });
    expect(await mailStatus(restricted, clock)).toMatchObject({
      schemaState: "unavailable",
      reason: "database-unavailable",
      phase: null,
      retrievals: null,
      exitCode: 1,
    });
  } finally {
    await client.pool.query("revoke usage on schema jev, jev_migrations from jev_status_no_select");
    await client.pool.query("drop role jev_status_no_select");
  }
});
