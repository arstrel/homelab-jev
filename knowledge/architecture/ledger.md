---
type: Architecture
title: PostgreSQL processing ledger
description: Describe the current ledger schema and atomic ingestion without
  claiming remote exactly-once behavior.
tags:
  - architecture
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-18T23:36:37.354Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/schema.ts
    title: src/adapters/postgres/schema.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/repositories.ts
    title: src/adapters/postgres/repositories.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/client.ts
    title: src/adapters/postgres/client.ts
x_jev_sources:
  - path: src/adapters/postgres/schema.ts
    sha256: eabe26f0a5f20e98ba63c18a7d4bbb7301a91d3e439f6855afd29b01c886ed77
  - path: src/adapters/postgres/repositories.ts
    sha256: 3b180be48d0705cc565ec4b6e48293f83a3f1b1ef634c5d792675f69bc790414
  - path: src/adapters/postgres/client.ts
    sha256: 42d0ab473c4468001ed4f8fe930a01ff44ca6403fe0c5c55203265f0d44694bf
  - path: src/adapters/postgres/mail-evidence.ts
    sha256: 1acf970e497c75f58aedbf3fe832b4d8a20e3b0d5588cb38bf12056ed1a46d51
  - path: src/domain/stored-mail-evidence.ts
    sha256: 96c85e35b79c141cf7ec8f1c186aad252275d42a4595f4e75ba77b9422630d11
  - path: src/adapters/postgres/mail-sync.ts
    sha256: defa205d334b92530ea3132710a09cf608f6dd54a6c0d2b9736d52f0dd1c9823
---

# PostgreSQL processing ledger

Drizzle with pg defines the worker-owned `jev` schema. Checkpoints track mailbox cursors; sources track source fingerprints; pending jobs have unique source/fingerprint/policy-version identities. Classifications store typed-result and correction payloads. Task links map source obligations to Todoist IDs and override state. Suppressions record completed/deleted obligations. Write intents record destination, stable request UUID, state and outcome.

Ingestion stores source changes, jobs and the checkpoint in one transaction. This gives a foundation for [checkpoint safety](gmail-checkpoints.md). Repositories also expose link, suppress, intent and settlement operations. These primitives do not yet implement the complete [remote write protocol](remote-write-safety.md).

The pool uses bounded connection and statement timeouts. Remote API calls belong outside transactions. Ledger status counts rows, including all write intents; it is not a provider freshness report. Pending-job scheduling and reconciliation are future use cases.

Manual [durable ingestion](mail-ingestion.md) now stores immutable complete conversation payloads keyed by mailbox/thread/fingerprint and binds jobs to exact versions. Composite foreign keys prevent mismatched bindings; an UPDATE-rejection trigger protects stored payloads. Latest observations live separately on source rows. Replays and overlapping batches deduplicate versions/jobs; older evidence remains available to its original job. Legacy unbound jobs return missing evidence until their exact version is recovered. This is processing storage, not another task UI.

Schema changes use [reviewed migrations](/operations/database-migrations.md), not implicit startup changes.

The separate [manual sync path](mail-sync.md) stores discovery phase/anchor/continuation and retrieval generations/backoff. Page queueing and discovery progress commit together; exact evidence/job writes and retrieval acknowledgement share the extracted evidence transaction. One dedicated lock-owning connection runs all sync commits. Legacy checkpoints/status counts remain separate.
