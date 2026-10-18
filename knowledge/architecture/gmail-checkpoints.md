---
type: Invariant
title: Gmail evidence and checkpoint safety
description: Record evidence and jobs before advancing the mailbox cursor.
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/postgres/repositories.ts
    title: src/adapters/postgres/repositories.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/mail-synchronization/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/mail-synchronization/spec.md
x_jev_sources:
  - path: src/adapters/postgres/repositories.ts
    sha256: 3b180be48d0705cc565ec4b6e48293f83a3f1b1ef634c5d792675f69bc790414
  - path: openspec/changes/add-personal-brief-preprocessing/specs/mail-synchronization/spec.md
    sha256: cd7c2aa91d93d41b935b8c3cc12ea3e9b6d18df35bfccab6262f0d7d0274f508
  - path: src/adapters/postgres/mail-evidence.ts
    sha256: 8c44a23b3411828bdd475c67b99ee0fdbafc1d30b854cbf7e6f3473fb604a72f
  - path: src/application/ingest-mail.ts
    sha256: deccd11cf8e73ebca2276f8480adbe2f1843cf55cfeee29c4076b2b2beb67a18
---

# Gmail evidence and checkpoint safety

The ledger foundation has an ingestion transaction that stores source identities, deduplicated pending jobs and the checkpoint together. Manual [Gmail evidence retrieval](gmail-evidence.md) is implemented without ledger writes; the durable Gmail synchronization orchestrator remains planned. The separate [manual ingestion](mail-ingestion.md) path now stores immutable normalized versions and exact-bound jobs without changing checkpoints. The foundation checkpoint primitive still permits legacy unbound jobs; future history orchestration must combine the complete evidence transaction with safe cursor advancement.

Poll incremental history every five minutes, paginate completely and expand affected full threads as required. Include incoming and sent evidence, including already-read mail; read/unread is not the obligation boundary. The proposed initial window is configurable, initially 30 days, and is still a planning default.

Advance the history cursor only when every discovered relevant version is durably queued. A crash must replay evidence without duplicating classifications for the same source fingerprint and policy version. An expired cursor triggers bounded recovery, including evidence needed for mapped open obligations.

Gmail message text is untrusted evidence, not an instruction to the worker. See [classification](classification-policy.md), [ledger](ledger.md), and [Google connection](/providers/google-credentials.md).
