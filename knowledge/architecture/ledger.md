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
  at: 2026-10-25T21:08:29Z
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
    sha256: 072baf9d636dc10659c4cb1501973534164388c2c58565d6b5ac89b2462218a8
  - path: src/adapters/postgres/repositories.ts
    sha256: 48905170dcad6aa08a86fc2629d2d9f870a5b3a461b6d2f82d5da12e278e1e4f
  - path: src/adapters/postgres/client.ts
    sha256: 42d0ab473c4468001ed4f8fe930a01ff44ca6403fe0c5c55203265f0d44694bf
  - path: src/adapters/postgres/mail-evidence.ts
    sha256: 1acf970e497c75f58aedbf3fe832b4d8a20e3b0d5588cb38bf12056ed1a46d51
  - path: src/domain/stored-mail-evidence.ts
    sha256: 96c85e35b79c141cf7ec8f1c186aad252275d42a4595f4e75ba77b9422630d11
  - path: src/adapters/postgres/mail-sync.ts
    sha256: da9949dd1e99d00b259c27dbfe9b6b1f73522b2a2aa8bb45273d987cd4e24b77
  - path: src/adapters/postgres/email-brief.ts
    sha256: 480be952ed744105755a955e58e636d77d0269bb54d198f5a8a2b99764009e19
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: src/adapters/postgres/automatic-capture.ts
    sha256: 3656d23083bbbff8243784295bf21be29568679ad212c08d6201a341925f3b42
  - path: src/adapters/postgres/email-tasks.ts
    sha256: e6ce035c84332bf068fff049598c0c37d9563823749ae23039d282d4c4ecccdd
---

# PostgreSQL processing ledger

Drizzle with pg defines the worker-owned `jev` schema. Checkpoints track mailbox cursors; sources track source fingerprints; pending jobs have unique source/fingerprint/policy-version identities. Classifications store typed-result and correction payloads. Task links map source obligations to Todoist IDs and override state. Suppressions record completed/deleted obligations. Write intents record destination, stable request UUID, state and outcome.

Production ingestion and sync use dedicated evidence/sync adapters for atomic writes and [checkpoint safety](gmail-checkpoints.md). The foundation `repositories` module now exposes only legacy raw status; its unused ingestion, classification, link, suppression, intent, settlement and test-only lookup methods were removed. Task and publication adapters retain their own [remote write protocol](remote-write-safety.md). Schema constraints and existing operational-adapter regressions remain covered with direct disposable fixtures.

The pool uses bounded connection and statement timeouts. Remote API calls belong outside transactions. Ledger status counts rows, including all write intents; it is not a provider freshness report. Bounded pending-job classification is implemented as opt-in publisher preprocessing; reconciliation remains planned.

Manual [durable ingestion](mail-ingestion.md) now stores immutable complete conversation payloads keyed by mailbox/thread/fingerprint and binds jobs to exact versions. Composite foreign keys prevent mismatched bindings; an UPDATE-rejection trigger protects stored payloads. Latest observations live separately on source rows. Replays and overlapping batches deduplicate versions/jobs; older evidence remains available to its original job. Legacy unbound jobs return missing evidence until their exact version is recovered. This is processing storage, not another task UI.

Schema changes use [reviewed migrations](/operations/database-migrations.md), not implicit startup changes.

The separate [manual sync path](mail-sync.md) stores discovery phase/anchor/continuation and retrieval generations/backoff. Page queueing and discovery progress commit together; exact evidence/job writes and retrieval acknowledgement share the extracted evidence transaction. One dedicated lock-owning connection runs all sync commits. Legacy checkpoints/status counts remain separate.

[Recovery](mail-recovery.md) adds durable mapped-target snapshots and recovery/gap metadata. Initialization atomically snapshots local mappings, promotes pending retrieval eligibility and advances state; stale revisions roll everything back. Final mapped-page queueing and target cleanup commit together. Recovery never clears immutable evidence, task identity or suppressions.

DB-only [diagnostics](/operations/mail-observation.md) compare managed migration history and required structures without applying migrations, then read one read-only repeatable snapshot. Classification backlog includes only pending primary jobs bound to current source evidence, including deferred work; unbound legacy jobs are a separate diagnostic and superseded versions are excluded without deletion. Retrieval gaps remain independent. Legacy raw status is unchanged. No new schema or evidence store is added.

Manual [brief publication](planner-handoff.md) reuses existing classifications and write intents without a migration. Its dedicated session lock is distinct from collection. Each saved exact-input judgment and bound-job completion share one transaction; remote calls occur outside transactions. One unique drive intent reserves the destination ID before creation and retains the prior successful generation/time through ambiguous updates. This is application-specific recovery, not a cross-service transaction or general reconciliation engine.

The optional scheduled classifier reuses current exact-bound jobs and saved brief judgments. New `inference_budgets` stores one stable lifetime allowance in integer nanodollars: admission atomically reserves maximum request cost; valid usage settles once, while crashes and ambiguous failures retain the charge. Queue deferral uses existing attempts/available-at fields. This is a small local spending ledger, with provider calls outside transactions. See docs/automatic-mail-classification.md.

Automatic capture reuses classifications for per-version terminal/retry outcomes and task_links for persistent source associations. Existing-task associations explicitly record no worker ownership and preserve all fields. The shared writer counts all recent Todoist creation intents, including ambiguous admissions, before a capped new write. No task inventory table or schema migration is added.
