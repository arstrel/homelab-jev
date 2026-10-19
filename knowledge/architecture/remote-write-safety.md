---
type: Invariant
title: Replay-safe remote writes
description: Persist stable intent identity before Todoist writes and reconcile
  ambiguous outcomes.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-18T06:26:11.007Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/schema.ts
    title: src/adapters/postgres/schema.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/repositories.ts
    title: src/adapters/postgres/repositories.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/todoist.ts
    title: src/adapters/todoist.ts
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
x_jev_sources:
  - path: src/adapters/postgres/schema.ts
    sha256: 24dbe743ecb812b02c3250cf7315edd142c4dfdecbec1edfe65396f3766c39f5
  - path: src/adapters/postgres/repositories.ts
    sha256: 3b180be48d0705cc565ec4b6e48293f83a3f1b1ef634c5d792675f69bc790414
  - path: src/adapters/todoist.ts
    sha256: 25d3f3101d99bef99549310651b2c86b35ff3422c7588d186ecc635ee24415da
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
---

# Replay-safe remote writes

The foundation stores unique request UUIDs and pending/ambiguous/complete write-intent states. The Todoist adapter preserves a caller-provided `X-Request-Id`; an offline contract test verifies that header. The orchestration described here is planned, not an existing exactly-once guarantee.

[Durable mail ingestion](mail-ingestion.md) is implemented and only writes PostgreSQL evidence/jobs. The new evidence bindings do not enable task creation or change existing remote-write intent guarantees.

Derive an immutable obligation key from source evidence and action identity. Persist the intent and request UUID before issuing the remote write. Reuse that UUID on retries. If a timeout leaves the result unknown, reconcile using the durable mapping and source marker before deciding whether another create is safe. Blind retries with new IDs can duplicate tasks.

One thread may contain several obligations; one obligation may span threads. Match known mappings first, then deterministic references, then bounded model judgments. Distinct actions must not collapse merely because they share a conversation.

Completion/deletion suppressions prevent replay from resurrecting user-resolved work. See [manual edits](manual-edits.md), [uncertainty](uncertainty.md), and [ledger](ledger.md).
