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
  at: "2026-10-19T02:37:00Z"
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
    sha256: 05dc4249c81d3598286afb7b40106f72510e4ce3814ebecfc95a6acdaff71d1b
  - path: docs/mail-observation.md
    sha256: d47113783b0e478ef67109635cb3f442abdde9f0612b74e8691a252dff8c88fe
  - path: docs/mail-observation-evidence.md
    sha256: 02710da7a7885a2a7cc68dfeb74410dde57172d02c02e525d83411b3e623d9aa
---

# Manual mail observation

The implemented `mail:status` diagnostic needs database configuration only. A read-only repeatable transaction checks managed migration history/structures and reads state plus aggregates. It uses no sync advisory lock, provider client, migration function or message payload. Concurrent sync can continue. Failure/missing-schema measurements stay unknown instead of becoming zeros. A successful diagnostic is not a provider health result.

Retrieval pending/due/retry counts and future retry time describe the collection backlog. Pending and unbound processing jobs are separate future-classifier inputs. Status preserves stored discovery/evidence timestamps and the sticky expired-history gap; it never advances either frontier. Report validation and SQL failure categories prevent arbitrary data from leaking into output.

The manual pilot uses existing bounded sync calls, at most 20 runs or 60 minutes per deliberate session. Preserve partial work and identities. Real catch-up followed by a strict no-change observation is required to complete parent 2.4. The evidence report records actual observations and limitations; tooling or synthetic tests alone do not complete live acceptance. Do not manufacture expired cursors, drop retries or infer scheduled availability from a manual session.

See [sync](/architecture/mail-sync.md), [migration preparation](database-migrations.md), [secret boundaries](secret-handling.md) and [test isolation](test-isolation.md). The operator runbook and evidence report are the reviewed repository snapshots above. Classification, downstream provider writes and scheduling remain later work.
