---
type: Runbook
title: Manual mail observation
description: Inspect stored collection progress without provider calls and keep live pilot claims tied to actual evidence.
tags:
  - operations
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-19T04:14:23Z
stale_after: "2026-11-18T02:37:00Z"
x_jev_delivery: mixed
sources:
  - id: sync-contract
    resource: /architecture/mail-sync.md
    title: Manual collection contract
x_jev_sources:
  - path: src/application/mail-status.ts
    sha256: 285b3acb725850d9eb4e79409564f4c73978b933433ae5224e3d39bdfb584733
  - path: src/adapters/postgres/mail-status.ts
    sha256: 9b1727c55fc209fb80796d1a35d8af51f89ddbe17345d92057970b551634ff7b
  - path: src/domain/mail-status.ts
    sha256: 968f9c84f9c5643ffc3ec0bd6bd035d9b5b792654929f33ea4d198a22c02d252
  - path: docs/mail-observation.md
    sha256: c90734a42b29772097e9177ad38f98ba4d4d5814299c28dc704335309a3d90d3
  - path: docs/mail-observation-evidence.md
    sha256: 1b6936e02395950d68f7225f764db9d70f2753c2005439de658f426f1a6c35af
---

# Manual mail observation

The implemented `mail:status` diagnostic needs database configuration only. A read-only repeatable transaction checks managed migration history/structures and reads state plus aggregates. It uses no sync advisory lock, provider client, migration function or message payload. Concurrent sync can continue. Failure/missing-schema measurements stay unknown instead of becoming zeros. A successful diagnostic is not a provider health result.

Retrieval pending/due/retry counts and future retry time describe the collection backlog. Pending and unbound processing jobs are separate future-classifier inputs. Status preserves stored discovery/evidence timestamps and the sticky expired-history gap; it never advances either frontier. Report validation and SQL failure categories prevent arbitrary data from leaking into output.

The manual pilot uses existing bounded sync calls, at most 20 runs or 60 minutes per deliberate session. Preserve partial work and identities. Real catch-up followed by a strict no-change observation is required to complete parent 2.4. The evidence report records actual observations and limitations; tooling or synthetic tests alone do not complete live acceptance. Do not manufacture expired cursors, drop retries or infer scheduled availability from a manual session.

The first authorized session backed up the configured database and applied reviewed migrations through 0004. The initial token-refresh failure was resolved by browser reauthorization. Eight bounded invocations reached discovery catch-up and stored 115 complete versions/jobs; 769 retrievals remain, including 17 partial-body and 8 provider-error retries. The session stopped at the provider-failure boundary. Evidence freshness remains null and strict no-change acceptance remains open. This establishes collection progress and honest gaps, not a completed pilot.

Follow-up read-only diagnosis found three sampled provider failures recoverable and identified exact-size equality as the cause of two unsupported-text samples. Corrected parsing accepts understated size metadata under unchanged actual-byte limits; both affected conversations then read completely while an oversized control remained partial. Stored work and freshness were unchanged. The evidence report distinguishes this diagnosis from operational backlog drainage and successful pilot acceptance.

See [sync](/architecture/mail-sync.md), [migration preparation](database-migrations.md), [secret boundaries](secret-handling.md) and [test isolation](test-isolation.md). The operator runbook and evidence report are the reviewed repository snapshots above. Classification, downstream provider writes and scheduling remain later work.

The post-PR #12 session added 50 complete versions/jobs, reaching 165 exact-bound pending jobs with 735 retrievals remaining. A read-only follow-up captured Gmail HTTP 403 `rateLimitExceeded`; the other selected samples shared that failed profile lookup. Rapid manual batches can exceed quota even under request/concurrency limits. The current reader now enforces a 1.5-second gap between Gmail request starts and latches on recognized throttling; the runbook preserves retry dates and session stop limits. DB-only diagnostics recognize `rate-limited`. This invocation-local pacing has synthetic coverage; a later live session must establish its operational behavior. Freshness remains null in the recorded observations and live acceptance stays open.
