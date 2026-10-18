# Reviewed PostgreSQL migrations

Jev owns only `jev` and the separate `jev_migrations` migration journal. It must not alter other homelab schemas. Schema TS and generated SQL/metadata are committed together. Drizzle schema push and migration-on-every-cycle are excluded.

Generate with `npm run db:generate`, review SQL and snapshots, then run offline and disposable database checks. Migration 0000 creates ledger tables and constraints; 0001 adds pending-job and task lookup indexes. Re-running application records no new migrations. SQL deliberately fails if an unmanaged `jev` schema already exists rather than silently adopting its contents.

For a deployment: confirm the operational target privately, take a database backup outside this repository using your normal credential-safe PostgreSQL backup process, review pending SQL and compatibility with the installed release, then run `npm run build` and explicitly `npm run db:migrate`. Operational connectivity alone is read-only; this foundation has not applied migrations to your existing database automatically. Check `node --env-file=.env dist/cli.js status` after application. No source/provider credentials belong in backups of this repository.

Recovery: stop the worker and inspect the applied journal privately. These migrations run transactionally; a failed migration leaves its journal entry and partial DDL unapplied. Repair the unapplied migration in a reviewed change, run the disposable upgrade/recovery test, then retry explicit application. Do not edit an already applied migration. If a bad migration was successfully applied, use a reviewed new forward migration, or restore a tested backup into a separate database and verify records before switching. No generated reverse migration is promised. Code rollback is allowed only when compatible with the resulting schema.

The integration suite proves upgrade from 0000 to 0001, injects invalid SQL after the index DDL, checks rollback/journal preservation, retries the reviewed SQL and verifies existing checkpoints and unrelated data survive. The destructive setup/cleanup used by those tests is restricted to their disposable target; it is not an operational recovery command.

## Durable mail evidence upgrade

Migration 0002 adds `mail_evidence_versions`, source observations and nullable `pending_jobs.evidence_fingerprint`. Its reviewed SQL also adds an UPDATE-rejection trigger; Drizzle snapshots describe tables/constraints, while this trigger remains explicit migration SQL. Composite foreign keys and matching-fingerprint checks bind jobs to their exact version. Existing jobs remain unbound until their exact historical evidence is recovered; no payload is invented or fetched during migration.

The populated upgrade test starts at 0000/0001, retains jobs/classifications/task links/suppressions/checkpoints, injects a failure after 0002 DDL, and checks rollback followed by repeatable repair. Runtime ingestion never applies migrations. Build and explicitly apply the reviewed migration before [manual ingestion](mail-ingestion.md). This code change has not migrated the operational database.

Rollback to the previous code is schema-compatible: stop ingestion, retain the added columns/table and revert the compiled release. Existing preview and ledger commands continue to work. Do not drop evidence, remove referenced versions, or reverse the migration automatically. PostgreSQL backups now contain private message text and require the same access controls as the database.
