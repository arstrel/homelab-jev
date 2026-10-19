---
type: Contract
title: Durable mail evidence ingestion
description: Preserve exact complete conversation versions and replay-safe
  pending jobs without claiming incremental synchronization.
tags:
  - architecture
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-18T23:36:37.354Z
stale_after: 2026-11-16T23:00:00Z
x_jev_delivery: implemented
sources:
  - id: evidence-contract
    resource: https://github.com/arstrel/homelab-jev/blob/cd7c6a6b7f094bb1779c1bb98b12d6d2711a6880/src/domain/mail-evidence.ts
    title: Merged normalized evidence contract
x_jev_sources:
  - path: src/domain/stored-mail-evidence.ts
    sha256: 96c85e35b79c141cf7ec8f1c186aad252275d42a4595f4e75ba77b9422630d11
  - path: src/application/ingest-mail.ts
    sha256: deccd11cf8e73ebca2276f8480adbe2f1843cf55cfeee29c4076b2b2beb67a18
  - path: src/adapters/postgres/mail-evidence.ts
    sha256: 1acf970e497c75f58aedbf3fe832b4d8a20e3b0d5588cb38bf12056ed1a46d51
  - path: src/adapters/postgres/schema.ts
    sha256: 24dbe743ecb812b02c3250cf7315edd142c4dfdecbec1edfe65396f3766c39f5
  - path: docs/mail-ingestion.md
    sha256: fb0d10754aff3141d59374902664640b5fe4472a6f4ddb952fa50b01ae7ac4a9
  - path: migrations/0002_durable_mail_evidence.sql
    sha256: aa7e4e79bcedf00c1ca435e227f52ea347095fa0343a113575fc7638193f3e9d
---

# Durable mail evidence ingestion

The explicit `mail:ingest` command reads bounded Gmail evidence, then atomically persists only complete eligible conversations and exact-bound pending jobs. It requires Google/database credentials only and prints sanitized counts. Current implementation is represented by repository snapshots; the source URL identifies the merged evidence contract it builds on.

Versions are keyed by mailbox/thread/fingerprint and immutable against UPDATE. Composite job bindings preserve the exact input even after a new reply creates another version. Replays and concurrent batches deduplicate by evidence and policy identity. Latest labels/time remain separate observations. Legacy jobs lacking text remain unavailable until that exact fingerprint is recovered; they never acquire the latest conversation silently.

Partial conversations are reported without a version or job; another manual run retries them only if selected again. Statement failure rolls back the entire bounded batch; a lost commit acknowledgement can leave an unknown outcome, resolved by safe replay. This is not a durable retrieval retry queue, history ingestion, checkpoint advancement, synchronization freshness, classification or remote writes. Preview stays read-only. See [checkpoint safety](gmail-checkpoints.md), [ledger](ledger.md), and [delivery boundary](/product/delivery-boundary.md).

Payloads contain private mail; database access/backups need mailbox-level care. No automatic garbage collection exists and job references block deletion. Operational migration/ingestion has not been performed by implementation tests. See [privacy](/operations/secret-handling.md), [migrations](/operations/database-migrations.md) and [test isolation](/operations/test-isolation.md).

A separate [manual sync command](mail-sync.md) now adds resumable history discovery and durable retrieval retries. It reuses the evidence transaction for atomic acknowledgement, while the older manual ingestion command retains its original recent-sample contract.
