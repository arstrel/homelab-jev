---
type: Runbook
title: Manual mail observation
description: Inspect stored collection progress without provider calls and keep live pilot claims tied to actual evidence.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T20:32:10Z
stale_after: "2026-11-18T02:37:00Z"
x_jev_delivery: implemented
sources:
  - id: sync-contract
    resource: /architecture/mail-sync.md
    title: Manual collection contract
x_jev_sources:
  - path: src/application/mail-status.ts
    sha256: 285b3acb725850d9eb4e79409564f4c73978b933433ae5224e3d39bdfb584733
  - path: src/adapters/postgres/mail-status.ts
    sha256: 589afa11025780e47d01cb6ac6051e71b365c635dabd26488c49c3b3a6646cb9
  - path: src/domain/mail-status.ts
    sha256: 968f9c84f9c5643ffc3ec0bd6bd035d9b5b792654929f33ea4d198a22c02d252
  - path: docs/mail-observation.md
    sha256: c90734a42b29772097e9177ad38f98ba4d4d5814299c28dc704335309a3d90d3
  - path: docs/mail-observation-evidence.md
    sha256: d615805f16343946e8ce577d78149780f5ac4b6fd77e2040c6af518b3a85ea71
---

# Manual mail observation

The implemented `mail:status` diagnostic needs database configuration only. A read-only repeatable transaction checks managed migration history/structures and reads whitelisted aggregates. It uses no sync ownership lock, provider client, migration function or message payload. Missing/failed measurements remain unknown, not zero; successful observation is not a provider-health result.

Schema readiness now includes the inference-allowance table introduced by migration 0005. The new schema does not grant diagnostics write authority. Pending classification counts include all pending ledger rows, including superseded versions that the current classifier will not select; they are not an exact executable-backlog measurement.

Retrieval counts, future retry time and stored discovery/evidence frontiers remain separate from classification/task freshness. Status never advances a frontier. Unknown failure text becomes a fixed category. Expired-history gaps remain visible after bounded scoped recovery.

The manual runbook caps a deliberate session at 20 sync invocations or 60 minutes, preserves partial work/retry dates, and requires real catch-up followed by a strict no-change observation. Historical October 18–22 sessions correctly remained incomplete; they are not continuing health snapshots.

October 25 repair and merged-release activation cleared the configured retrieval scope. Later timer reports at 20:17:17.791Z and 20:22:23.307Z each had zero queued references, retrieval attempts, new versions/jobs and pending/retrying work; discovery and complete-evidence freshness advanced. Both exited 0 with zero downstream writes. This closes parent 2.4 and observation 3.1; see repository `docs/mail-observation-evidence.md` for the exact acceptance table. Collection generated no new classification work; the separate publisher can still drain older pending jobs.

Pacing/stop-on-throttle and expired-cursor recovery retain their separately stated synthetic/live limits. No expired cursor was manufactured. Scope is recent bootstrap plus subsequent history and mapped recovery, not an all-time mailbox export. See [sync](/architecture/mail-sync.md), [migration preparation](database-migrations.md), [privacy](secret-handling.md) and [test isolation](test-isolation.md).
