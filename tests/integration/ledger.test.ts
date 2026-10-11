import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { testDatabaseUrl } from "../../scripts/test-database.js";
import { connect } from "../../src/adapters/postgres/client.js";
import { applyMigrations } from "../../src/adapters/postgres/migrate.js";
import { repositories } from "../../src/adapters/postgres/repositories.js";
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
    "truncate jev.classifications, jev.task_links, jev.pending_jobs, jev.sources, jev.checkpoints, jev.suppressions, jev.write_intents",
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
    ).toBe(2);
  });
  it("durably ingests before checkpoint advancement and deduplicates replay", async () => {
    await repo.ingest({ checkpoint, sources: [source], jobs: [job] });
    await repo.ingest({
      checkpoint: { ...checkpoint, historyId: "2" },
      sources: [source],
      jobs: [{ ...job, id: ids.classification }],
    });
    expect(await repo.pending()).toHaveLength(1);
    expect((await repo.checkpoint("fixture"))?.historyId).toBe("2");
  });
  it("rolls back source writes and checkpoint on a failed job", async () => {
    await repo.ingest({ checkpoint, sources: [source], jobs: [job] });
    await expect(
      repo.ingest({
        checkpoint: { ...checkpoint, historyId: "bad" },
        sources: [{ ...source, sourceId: "new" }],
        jobs: [{ ...job, sourceId: "missing", id: ids.classification }],
      }),
    ).rejects.toThrow();
    expect((await repo.checkpoint("fixture"))?.historyId).toBe("1");
    expect((await client.pool.query("select count(*)::int as n from jev.sources")).rows[0]?.n).toBe(
      1,
    );
  });
  it("stores classifications, multi-source links and suppressions", async () => {
    await repo.ingest({
      checkpoint,
      sources: [source, { ...source, sourceId: "message-2" }],
      jobs: [job],
    });
    await repo.classify({
      id: ids.classification,
      jobId: ids.job,
      modelVersion: "fixture-model",
      result: { attention: true, probability: 0.9 },
      createdAt: instant,
    });
    await repo.link({
      mailbox: "fixture",
      sourceId: "message-1",
      obligationKey: "reply",
      taskId: "fake-task",
    });
    await repo.link({
      mailbox: "fixture",
      sourceId: "message-2",
      obligationKey: "reply",
      taskId: "fake-task",
    });
    await expect(
      repo.link({
        mailbox: "fixture",
        sourceId: "message-1",
        obligationKey: "reply",
        taskId: "duplicate",
      }),
    ).rejects.toThrow();
    await repo.suppress({ obligationKey: "reply", reason: "completed", createdAt: instant });
    expect(await repo.suppressed("reply")).toBe(true);
    expect(await repo.suppressed("new-reply")).toBe(false);
  });
  it("retains ambiguous intents across repository recreation and enforces request identity", async () => {
    const intent = {
      id: ids.intent,
      destination: "todoist" as const,
      obligationKey: "reply",
      requestId: ids.request,
      createdAt: instant,
    };
    await repo.intent(intent);
    expect(await repositories(client).unresolvedIntents()).toHaveLength(1);
    await expect(repo.intent({ ...intent, id: ids.classification })).rejects.toThrow();
    await repo.settle(ids.intent, "ambiguous", { code: "timeout" });
    expect(await repositories(client).unresolvedIntents()).toHaveLength(1);
    await repo.settle(ids.intent, "complete", { taskId: "fake-task" });
    expect(await repo.unresolvedIntents()).toHaveLength(0);
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
    const second = journal.entries.pop();
    writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify(journal));
    // Separate disposable schemas mimic an installation on the prior version.
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
    ).toBe(1);
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
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
