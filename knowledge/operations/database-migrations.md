---
type: Runbook
title: Explicit database migrations
description: Apply reviewed migrations only to the worker-owned schemas with
  rollback preparation.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-19T02:15:25.563821Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/migrations.md
    title: docs/migrations.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/migrate.ts
    title: src/adapters/postgres/migrate.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/migrations/0000_romantic_longshot.sql
    title: migrations/0000_romantic_longshot.sql
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/migrations/0001_ambiguous_squadron_sinister.sql
    title: migrations/0001_ambiguous_squadron_sinister.sql
x_jev_sources:
  - path: docs/migrations.md
    sha256: 6f3ba78d1c7947636f3e5dfb0b0caa4abae30f3864383b446338f92699660ef2
  - path: src/adapters/postgres/migrate.ts
    sha256: 8782971aeeddc143c47abf5eb86b892bfcaeedf5e141f36fff704ca6a1fbc147
  - path: migrations/0000_romantic_longshot.sql
    sha256: 3a367d97597018843148595da0e1242ddc249aaf136efe9229e40d8a55f9454d
  - path: migrations/0001_ambiguous_squadron_sinister.sql
    sha256: fa1afdf14906ea532c16e23c677f71dc69b3dfade2eee363117b3cb73c9d14c4
  - path: migrations/0002_durable_mail_evidence.sql
    sha256: aa7e4e79bcedf00c1ca435e227f52ea347095fa0343a113575fc7638193f3e9d
  - path: migrations/0003_incremental_mail_sync.sql
    sha256: ad163f99b79099d404b78b786be6ca90f81a127125362f4dbfb9888dfae8ec36
---

# Explicit database migrations

Drizzle schema definitions produce versioned SQL which must be reviewed. The worker owns `jev` and the `jev_migrations` journal, not other homelab schemas. Apply with the explicit compiled migration command; ordinary status/cycle startup must not silently migrate production.

Before deployment, verify target, backup and compatibility. Test fresh initialization, repeated application, upgrade and invalid-SQL rollback against isolated PostgreSQL. Failed transactional migrations leave no partial application; repair an unapplied migration only after review. An already applied migration requires a new forward change rather than editing history.

Migration 0002 adds immutable mail evidence, source observations and nullable exact job bindings while retaining populated legacy ledger data. Its trigger is explicit reviewed SQL alongside the Drizzle table snapshot. The upgrade/failed-repair suite now exercises the previous two migrations and preserves jobs, classifications, links and suppressions. It is code-tested, not automatically deployed. Prior code remains compatible with the additive schema.

Restore/rollback procedures must be rehearsed in isolation and compatible with the selected compiled release. The presence of migration files does not prove production has applied them. Follow the detailed migration runbook and [native releases](native-releases.md).

Migration 0003 adds sync state and a retrieval backlog without changing the legacy checkpoint/evidence contracts. The populated 0002-to-0003 failed/repaired upgrade and prior 0002 upgrade both remain tested. No operational migration or automatic startup migration is claimed.

Migration 0004 adds recovery metadata, expands phases and creates mapped-target snapshots. Existing expired states receive the history-gap flag. A populated 0003-to-0004 failure/repair test preserves anchors, retry state, exact evidence and task links. Stop sync before rollback: the prior synchronizer cannot interpret active recovery phases. Finish recovery to compatible history state before invoking its sync command, or keep sync stopped until restoring recovery-capable code. Preserve the additive schema and pending work. See [recovery](/architecture/mail-recovery.md).
