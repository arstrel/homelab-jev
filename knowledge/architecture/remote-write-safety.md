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
  at: 2026-10-22T01:53:00Z
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
    sha256: 893a433a2878b505872f14719cced7bfede0521b4c505e203de0b9e1fda749a3
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: src/adapters/postgres/email-tasks.ts
    sha256: db821ef4f6d482c7b593f42f32836c7a14da54be2e404f54065d01cc908b6e76
  - path: src/application/email-tasks.ts
    sha256: 62c76aa18efc14e013816b152a1189716d3b085216ac063173565c8117d20962
  - path: docs/email-tasks.md
    sha256: 17f197c991ba5101312db27c84e2e145c4c3d181e319a73f764ae67dbf075a69
  - path: src/domain/email-task.ts
    sha256: ae0b058b9b3670e6140193059a306bd7e5cdf923649b70f5df4db5fdf1d6ec6c
---

# Replay-safe remote writes

The foundation stores unique request UUIDs and pending/ambiguous/complete write-intent states. The Todoist adapter preserves a caller-provided `X-Request-Id`. The implemented [manual reviewed task flow](/providers/todoist-boundary.md) saves an ambiguous intent before dispatch, disables implicit SDK network retries, and atomically links a confirmed task while completing the intent. Overlapping applies skip; existing links suppress repeat creation. An uncertain response or settlement stops the batch and blocks blind replay, requiring manual inspection. This narrow source-scoped flow is not general obligation reconciliation or an exactly-once guarantee.

[Durable mail ingestion](mail-ingestion.md) is implemented and only writes PostgreSQL evidence/jobs. The new evidence bindings do not enable task creation or change existing remote-write intent guarantees.

The broader planned processor should derive an immutable obligation key from source evidence and action identity. Persist the intent and request UUID before issuing the remote write. Reuse that UUID on safe retries. If a timeout leaves the result unknown, reconcile using the durable mapping and source marker before deciding whether another create is safe. Blind retries with new IDs can duplicate tasks. The manual slice deliberately permits only one linked task per conversation and never retries an ambiguous create.

One thread may contain several obligations; one obligation may span threads. Match known mappings first, then deterministic references, then bounded model judgments. Distinct actions must not collapse merely because they share a conversation.

Completion/deletion suppressions prevent replay from resurrecting user-resolved work. See [manual edits](manual-edits.md), [uncertainty](uncertainty.md), and [ledger](ledger.md).

Review policy v2 rejects old v1 review files, while source-scoped creation identities deliberately retain the v1 key. A new prompt or title policy must not bypass an existing ambiguous intent or task link. The October 21 fresh preview made no task-intent/link changes; no live capture or automated reconciliation is established by that result.
