---
type: Runbook
title: Explicit database migrations
description: Apply reviewed migrations only to the worker-owned schemas with rollback preparation.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-11T02:21:58Z"
stale_after: "2026-11-10T02:21:58Z"
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
    sha256: 9a66596df8531edcec5137deaae05baf5aaec130b6e77bf7c77b5b8e0132c8bc
  - path: src/adapters/postgres/migrate.ts
    sha256: 8782971aeeddc143c47abf5eb86b892bfcaeedf5e141f36fff704ca6a1fbc147
  - path: migrations/0000_romantic_longshot.sql
    sha256: 3a367d97597018843148595da0e1242ddc249aaf136efe9229e40d8a55f9454d
  - path: migrations/0001_ambiguous_squadron_sinister.sql
    sha256: fa1afdf14906ea532c16e23c677f71dc69b3dfade2eee363117b3cb73c9d14c4
---

# Explicit database migrations

Drizzle schema definitions produce versioned SQL which must be reviewed. The worker owns `jev` and the `jev_migrations` journal, not other homelab schemas. Apply with the explicit compiled migration command; ordinary status/cycle startup must not silently migrate production.

Before deployment, verify target, backup and compatibility. Test fresh initialization, repeated application, upgrade and invalid-SQL rollback against isolated PostgreSQL. Failed transactional migrations leave no partial application; repair an unapplied migration only after review. An already applied migration requires a new forward change rather than editing history.

Restore/rollback procedures must be rehearsed in isolation and compatible with the selected compiled release. The presence of migration files does not prove production has applied them. Follow the detailed migration runbook and [native releases](native-releases.md).
