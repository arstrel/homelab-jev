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
  at: 2026-10-18T23:36:37.354Z
stale_after: 2026-11-17T23:00:00Z
x_jev_delivery: implemented
sources:
  - id: gmail-history
    resource: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list
    title: Google history paging and expiry contract
x_jev_sources:
  - path: src/application/sync-mail.ts
    sha256: f28855912fa6b964fd5918aee3d5bf2bd77849a2521fb33c1aac2d74ceb62f84
  - path: src/adapters/postgres/mail-sync.ts
    sha256: defa205d334b92530ea3132710a09cf608f6dd54a6c0d2b9736d52f0dd1c9823
  - path: src/adapters/gmail.ts
    sha256: 68d953c97b4a72d3d635679d3764e1212272a6ccab899997a8c427c576618da4
  - path: src/cli-mail-sync.ts
    sha256: 3215916c5e8c32599ed344614b05a42d9986d9cf75b8a3ca392f66e0cf9785d7
  - path: docs/mail-sync.md
    sha256: 7197910dcbda44cd9644c913f32fa44cdd1648bbc4d97fca3b8ee1b49a71ed0c
  - path: migrations/0003_incremental_mail_sync.sql
    sha256: ad163f99b79099d404b78b786be6ca90f81a127125362f4dbfb9888dfae8ec36
---

# Manual incremental Gmail synchronization

The explicit `mail:sync` command freezes a recent bootstrap window after capturing a history anchor. Its overlapping second boundary avoids dropping anchor-covered mail. Bootstrap and history pages resume across bounded runs; page enqueueing and discovery progress commit atomically. The official source describes the external API, while repository snapshots identify the implementation.

A durable retrieval backlog retains partial/provider failures with capped backoff independently of new mail. Acknowledgement and exact evidence/job persistence share one transaction. A dedicated PostgreSQL connection owns both the advisory lock and every sync commit; loss of ownership cancels requests and prevents further commits. Overlapping commands skip providers.

Discovery catch-up does not imply evidence completion. Evidence freshness advances only after an exhausted history observation and an empty backlog, using that observation time. Existing jobs remain pending after classification failure and later discovery. Reports contain sanitized counts/reasons/timestamps only. The system observes current thread versions, not every intermediate historical revision.

History expiry preserves state and reports recovery-required. Automatic recovery/mapped-obligation scans, five-minute launchd deployment, classification and remote writes remain planned. No operational migration or credentialed synchronization is performed by tests. See [checkpoint safety](gmail-checkpoints.md), [ledger](ledger.md), [delivery boundary](/product/delivery-boundary.md) and [test isolation](/operations/test-isolation.md).
