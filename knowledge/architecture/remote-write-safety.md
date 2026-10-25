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
  at: 2026-10-25T18:27:08Z
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
    sha256: 072baf9d636dc10659c4cb1501973534164388c2c58565d6b5ac89b2462218a8
  - path: src/adapters/postgres/repositories.ts
    sha256: 3b180be48d0705cc565ec4b6e48293f83a3f1b1ef634c5d792675f69bc790414
  - path: src/adapters/todoist.ts
    sha256: 893a433a2878b505872f14719cced7bfede0521b4c505e203de0b9e1fda749a3
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: src/adapters/postgres/email-tasks.ts
    sha256: e6ce035c84332bf068fff049598c0c37d9563823749ae23039d282d4c4ecccdd
  - path: src/application/email-tasks.ts
    sha256: 4e482cd3b344f06d4eb32aa5314be0efc091b0557f39b94e95a08e4e58afa3fd
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/domain/email-task.ts
    sha256: 0d3f27d05e8b330b028e79fa526f20b9c5b1370df2098cc8478b4b7ad95bcdc2
  - path: src/application/capture-mail.ts
    sha256: 37b80c3e58e80baa801d2856a746e614e971700e537092fa05bd15f9fdc7ce7b
  - path: src/adapters/postgres/automatic-capture.ts
    sha256: 3656d23083bbbff8243784295bf21be29568679ad212c08d6201a341925f3b42
  - path: docs/automatic-todoist-capture.md
    sha256: 8d54de7da56aef47f136f8eb9bc43331a691d155cd1b5f2e404d36bc944de0a3
---

# Replay-safe remote writes

The foundation stores unique request UUIDs and pending/ambiguous/complete write-intent states. The Todoist adapter preserves a caller-provided `X-Request-Id`. The implemented [manual reviewed task flow](/providers/todoist-boundary.md) saves an ambiguous intent before dispatch, disables implicit SDK network retries, and atomically links a confirmed task while completing the intent. Overlapping applies skip; existing links suppress repeat creation. An uncertain response or settlement stops the batch and blocks blind replay, requiring manual inspection. This narrow source-scoped flow is not general obligation reconciliation or an exactly-once guarantee.

[Durable mail ingestion](mail-ingestion.md) is implemented and only writes PostgreSQL evidence/jobs. The new evidence bindings do not enable task creation or change existing remote-write intent guarantees.

The broader planned processor should derive an immutable obligation key from source evidence and action identity. Persist the intent and request UUID before issuing the remote write. Reuse that UUID on safe retries. If a timeout leaves the result unknown, reconcile using the durable mapping and source marker before deciding whether another create is safe. Blind retries with new IDs can duplicate tasks. The manual slice deliberately permits only one linked task per conversation and never retries an ambiguous create.

One thread may contain several obligations; one obligation may span threads. Match known mappings first, then deterministic references, then bounded model judgments. Distinct actions must not collapse merely because they share a conversation.

Completion/deletion suppressions prevent replay from resurrecting user-resolved work. See [manual edits](manual-edits.md), [uncertainty](uncertainty.md), and [ledger](ledger.md).

Review policy v2 rejects old v1 review files, while source-scoped creation identities deliberately retain the v1 key. A new prompt or title policy must not bypass an existing ambiguous intent or task link. The October 21 fresh preview made no task-intent/link changes; no live capture or automated reconciliation is established by that result.

The opt-in automatic capture pilot reuses the manual writer lock, stable source identity and ambiguous-intent protocol. It admits at most three new creation intents per rolling 24 hours, counting ambiguous/manual intents too, and stops after one successful create per cycle. Exact-reference or bounded semantic matches save associations only, not ownership or remote edits. Persistent mapped tasks are never recreated. Full reconciliation of ambiguous outcomes remains manual; the pilot does not claim all-time duplicate detection. See docs/automatic-todoist-capture.md.
