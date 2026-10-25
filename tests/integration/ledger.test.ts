import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { repositories } from "../../src/adapters/postgres/repositories.js";
import * as s from "../../src/adapters/postgres/schema.js";
import { ids, instant } from "../fixtures/runtime.js";

const client = connect(testDatabaseUrl(process.env));
const repo = repositories(client);
const source = {
  mailbox: "fixture",
  sourceId: "message-1",
  fingerprint: "v1",
  observedAt: instant,
};
const job = {
  id: ids.job,
  mailbox: source.mailbox,
  sourceId: source.sourceId,
  fingerprint: source.fingerprint,
  policyVersion: "fixture-1",
  availableAt: instant,
};
const checkpoint = { mailbox: source.mailbox, historyId: "1", syncedAt: instant };
beforeAll(async () => {
  await client.pool.query(
    "create schema unrelated; create table unrelated.kept (value text); insert into unrelated.kept values ('preserve')",
  );
  await applyMigrations(client);
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await client.pool.query(
    "truncate jev.mail_recovery_targets, jev.mail_retrievals, jev.mail_sync_state, jev.classifications, jev.task_links, jev.pending_jobs, jev.mail_evidence_versions, jev.sources, jev.checkpoints, jev.suppressions, jev.write_intents",
  );
});

describe("PostgreSQL ledger guarantees", () => {
  it("applies fresh and repeated migrations without touching other schemas", async () => {
    await applyMigrations(client);
    expect((await client.pool.query("select value from unrelated.kept")).rows).toEqual([
      { value: "preserve" },
    ]);
    expect(
      (
        await client.pool.query(
          "select count(*)::int as n from jev_migrations.__drizzle_migrations",
        )
      ).rows[0]?.n,
    ).toBe(6);
  });
  it("retains legacy raw status counts independently of classification eligibility", async () => {
    expect(await repo.status()).toEqual({ checkpoints: 0, pendingJobs: 0, writeIntents: 0 });
    await client.db.insert(s.checkpoints).values(checkpoint);
    await client.db.insert(s.sources).values(source);
    await client.db
      .insert(s.pendingJobs)
      .values([job, { ...job, id: ids.classification, fingerprint: "v2", state: "complete" }]);
    await client.db.insert(s.writeIntents).values({
      id: ids.intent,
      destination: "todoist",
      obligationKey: "reply",
      requestId: ids.request,
      state: "complete",
      createdAt: instant,
    });
    expect(await repo.status()).toEqual({ checkpoints: 1, pendingJobs: 1, writeIntents: 1 });
  });
  it("stores classifications, multi-source links and suppressions", async () => {
    await client.db.insert(s.sources).values([source, { ...source, sourceId: "message-2" }]);
    await client.db.insert(s.pendingJobs).values(job);
    await client.db.insert(s.classifications).values({
      id: ids.classification,
      jobId: ids.job,
      modelVersion: "fixture-model",
      result: { attention: true, probability: 0.9 },
      createdAt: instant,
    });
    await client.db.insert(s.taskLinks).values({
      mailbox: "fixture",
      sourceId: "message-1",
      obligationKey: "reply",
      taskId: "fake-task",
    });
    await client.db.insert(s.taskLinks).values({
      mailbox: "fixture",
      sourceId: "message-2",
      obligationKey: "reply",
      taskId: "fake-task",
    });
    await expect(
      client.db.insert(s.taskLinks).values({
        mailbox: "fixture",
        sourceId: "message-1",
        obligationKey: "reply",
        taskId: "duplicate",
      }),
    ).rejects.toThrow();
    await client.db
      .insert(s.suppressions)
      .values({ obligationKey: "reply", reason: "completed", createdAt: instant });
    expect(await client.db.select().from(s.suppressions)).toEqual([
      { obligationKey: "reply", reason: "completed", createdAt: instant },
    ]);
  });
  it("enforces durable write-intent identity", async () => {
    const intent = {
      id: ids.intent,
      destination: "todoist" as const,
      obligationKey: "reply",
      requestId: ids.request,
      createdAt: instant,
    };
    await client.db.insert(s.writeIntents).values(intent);
    await expect(
      client.db.insert(s.writeIntents).values({ ...intent, id: ids.classification }),
    ).rejects.toThrow();
  });
  it("holds advisory locks on dedicated connections until release", async () => {
    const first = await client.pool.connect();
    const second = await client.pool.connect();
    try {
      expect(
        (await first.query("select pg_try_advisory_lock(1042026) as held")).rows[0]?.held,
      ).toBe(true);
      expect(
        (await second.query("select pg_try_advisory_lock(1042026) as held")).rows[0]?.held,
      ).toBe(false);
      await first.query("select pg_advisory_unlock(1042026)");
      expect(
        (await second.query("select pg_try_advisory_lock(1042026) as held")).rows[0]?.held,
      ).toBe(true);
      await second.query("select pg_advisory_unlock(1042026)");
    } finally {
      first.release();
      second.release();
    }
  });
});

it("upgrades a prior migration and recovers a failed migration by reviewed forward repair", async () => {
  const folder = mkdtempSync(join(tmpdir(), "jev-migrations-"));
  try {
    cpSync("migrations", folder, { recursive: true });
    const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8"));
    // Retain the existing 0002 populated-upgrade regression when later migrations are added.
    journal.entries = journal.entries.slice(0, 3);
    const second = journal.entries.pop();
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    // Separate disposable schemas mimic an installation on the prior two migrations.
    for (const entry of [...journal.entries, second]) {
      const path = join(folder, `${entry.tag}.sql`);
      writeFileSync(path, readFileSync(path, "utf8").replaceAll('"jev"', '"jev_upgrade"'));
    }
    await migrate(client.db, {
      migrationsFolder: folder,
      migrationsSchema: "jev_upgrade_migrations",
    });
    await client.pool.query(
      "insert into jev_upgrade.checkpoints values ('fixture','original', now())",
    );
    await client.pool.query(`
      insert into jev_upgrade.sources values ('fixture','old-thread','old-fingerprint',now());
      insert into jev_upgrade.pending_jobs (id,mailbox,source_id,fingerprint,policy_version,available_at,attempts,state)
        values ('10000000-0000-4000-8000-000000000001','fixture','old-thread','old-fingerprint','old-policy',now(),3,'complete');
      insert into jev_upgrade.classifications values ('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','old-model','{}',null,now());
      insert into jev_upgrade.task_links values ('fixture','old-thread','old-obligation','old-task','{}');
      insert into jev_upgrade.suppressions values ('old-obligation','completed',now());
    `);
    const priorMigrationCount = journal.entries.length;
    journal.entries.push(second);
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    const path = join(folder, `${second.tag}.sql`);
    const reviewedSql = readFileSync(path, "utf8");
    writeFileSync(
      path,
      `${reviewedSql}\n--> statement-breakpoint\nSELECT deliberately_invalid_sql;`,
    );
    await expect(
      migrate(client.db, { migrationsFolder: folder, migrationsSchema: "jev_upgrade_migrations" }),
    ).rejects.toThrow();
    expect(
      (
        await client.pool.query(
          "select count(*)::int as n from jev_upgrade_migrations.__drizzle_migrations",
        )
      ).rows[0]?.n,
    ).toBe(priorMigrationCount);
    writeFileSync(path, reviewedSql);
    await migrate(client.db, {
      migrationsFolder: folder,
      migrationsSchema: "jev_upgrade_migrations",
    });
    await migrate(client.db, {
      migrationsFolder: folder,
      migrationsSchema: "jev_upgrade_migrations",
    });
    expect(
      (await client.pool.query("select history_id from jev_upgrade.checkpoints")).rows[0]
        ?.history_id,
    ).toBe("original");
    expect((await client.pool.query("select value from unrelated.kept")).rows[0]?.value).toBe(
      "preserve",
    );
    expect(
      (
        await client.pool.query(
          "select evidence_fingerprint,attempts,state from jev_upgrade.pending_jobs",
        )
      ).rows,
    ).toEqual([{ evidence_fingerprint: null, attempts: 3, state: "complete" }]);
    for (const table of ["classifications", "task_links", "suppressions"])
      expect(
        (await client.pool.query(`select count(*)::int as n from jev_upgrade.${table}`)).rows[0]?.n,
      ).toBe(1);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
