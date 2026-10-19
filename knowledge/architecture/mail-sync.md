---
type: Contract
title: Manual incremental Gmail synchronization
description: Resume discovery and durable retrieval retries while keeping
  discovery progress separate from complete evidence freshness.
tags:
  - architecture
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-19T04:14:23Z
stale_after: 2026-11-17T23:00:00Z
x_jev_delivery: implemented
sources:
  - id: gmail-history
    resource: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
    title: Google history paging and expiry contract
x_jev_sources:
  - path: src/application/sync-mail.ts
    sha256: cb03f2894dec68d3a0935f2c24e002cb92c56d8fe70e493598eb2b52b7a6c891
  - path: src/adapters/postgres/mail-sync.ts
    sha256: da9949dd1e99d00b259c27dbfe9b6b1f73522b2a2aa8bb45273d987cd4e24b77
  - path: src/adapters/gmail.ts
    sha256: 87224a07d772828108d8ce67b295a22a1656802327116f63a750c280bafca0ae
  - path: src/cli-mail-sync.ts
    sha256: 3215916c5e8c32599ed344614b05a42d9986d9cf75b8a3ca392f66e0cf9785d7
  - path: docs/mail-sync.md
    sha256: 2eb1a321a472f13e7b7a65ad14e7b7663f173a1b4c03be1326b5fb7c30773fc9
  - path: migrations/0003_incremental_mail_sync.sql
    sha256: ad163f99b79099d404b78b786be6ca90f81a127125362f4dbfb9888dfae8ec36
---

# Manual incremental Gmail synchronization

The explicit `mail:sync` command freezes a recent bootstrap window after capturing a history anchor. Its overlapping second boundary avoids dropping anchor-covered mail. Bootstrap and history pages resume across bounded runs; page enqueueing and discovery progress commit atomically. The official source describes the external API, while repository snapshots identify the implementation.

A durable retrieval backlog retains partial/provider failures with capped backoff independently of new mail. Acknowledgement and exact evidence/job persistence share one transaction. A dedicated PostgreSQL connection owns both the advisory lock and every sync commit; loss of ownership cancels requests and prevents further commits. Overlapping commands skip providers.

Discovery catch-up does not imply evidence completion. Evidence freshness advances only after an exhausted history observation and an empty backlog, using that observation time. Existing jobs remain pending after classification failure and later discovery. Reports contain sanitized counts/reasons/timestamps only. The system observes current thread versions, not every intermediate historical revision.

The separate DB-only `mail:status` command reads stored state and aggregate retrieval/classification diagnostics in one consistent read-only snapshot without the sync lock. It never advances freshness or establishes current Gmail availability. Follow the [observation procedure](/operations/mail-observation.md); live collection evidence remains separate from synthetic tests.

History expiry now starts [bounded recovery](mail-recovery.md): a fresh anchor, frozen recent window, durable snapshot of all mapped conversations and history catch-up. Recovery steps and pages resume under the same invocation limits. Reports retain the unreplayed history gap after scoped evidence becomes complete. Five-minute launchd deployment, classification and remote writes remain planned. No operational migration or credentialed synchronization is performed by tests. See [checkpoint safety](gmail-checkpoints.md), [ledger](ledger.md), [delivery boundary](/product/delivery-boundary.md) and [test isolation](/operations/test-isolation.md).

Gmail request starts are spaced by at least 1.5 seconds within each reader. Recognized throttling stops selection: discovery throttling prevents backlog reads; retrieval throttling backs off that item and leaves later work untouched. Completed evidence/jobs remain committed, and freshness does not advance with the failure. DB-only status recognizes `rate-limited`. This uses the existing schema and 120-second deadline, without cross-process quota accounting.
