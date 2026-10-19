---
type: Invariant
title: Bounded expired-cursor recovery
description: Recover recent and mapped mail without losing known work or claiming complete expired history.
tags:
  - architecture
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-19T02:15:00Z"
stale_after: "2026-11-18T02:15:00Z"
x_jev_delivery: implemented
sources:
  - id: sync-contract
    resource: mail-sync.md
    title: Manual incremental synchronization contract
x_jev_sources:
  - path: src/application/sync-mail.ts
    sha256: 3b740603c34937780c5802f9d8d7b9b2d871d2062c886ab1d16282e159dbe660
  - path: src/adapters/postgres/mail-sync.ts
    sha256: da9949dd1e99d00b259c27dbfe9b6b1f73522b2a2aa8bb45273d987cd4e24b77
  - path: migrations/0004_mail_sync_recovery.sql
    sha256: 4e8c9dcbc9308e877cc03d6c2e5efedafb35c3c5359cef31445e8d1fdd7291be
  - path: tests/integration/mail-recovery.test.ts
    sha256: 7e386e4bf56673f3c77cdfea33b0280fa348aaa8d980f70a5924b72ca044bef9
  - path: openspec/changes/add-mail-sync-recovery/design.md
    sha256: 826fb3d4eb44206c4f3e266498309781ebd26605c26985faa8b6fa626682ff7e
---

# Bounded expired-cursor recovery

An expired anchor persists `recovery-required` and a history-gap flag. Recovery captures a fresh anchor before freezing a new recent window. Its initialization transaction snapshots every locally mapped thread and promotes existing backlog to history eligibility, preserving attempts and retry dates while invalidating stale generations. All mappings conservatively include open obligations without consulting Todoist.

Recent pages, mapped keyset pages and new-anchor history catch-up resume across manual runs. The mapped inventory survives changes to live links. Final mapped queueing and snapshot cleanup share a transaction. Each discovery attempt and recovery initialization consumes a step; renewed expiry restarts under the same step, request and deadline bounds. Missing mapped mail does not remove tasks or mappings. Incomplete bodies remain retryable.

Evidence freshness and recovery completion require exhausted history and an empty backlog. Successful recovery describes current recent-window plus mapped-thread coverage, not every older unmapped thread or intermediate expired change. The history-gap flag stays true after completion. Reports contain fixed scope, counts and timestamps only.

Migration 0004 and synthetic recovery tests are delivered; operational migration, live synchronization and scheduling are not implied. See [sync](mail-sync.md), [checkpoint safety](gmail-checkpoints.md), [migrations](/operations/database-migrations.md) and [test isolation](/operations/test-isolation.md).
