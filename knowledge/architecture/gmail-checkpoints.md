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
  at: 2026-10-19T02:15:25.569164Z
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
    sha256: 1acf970e497c75f58aedbf3fe832b4d8a20e3b0d5588cb38bf12056ed1a46d51
  - path: src/application/ingest-mail.ts
    sha256: deccd11cf8e73ebca2276f8480adbe2f1843cf55cfeee29c4076b2b2beb67a18
  - path: src/adapters/postgres/mail-sync.ts
    sha256: da9949dd1e99d00b259c27dbfe9b6b1f73522b2a2aa8bb45273d987cd4e24b77
  - path: src/application/sync-mail.ts
    sha256: bb92f1d81ddade4e29268c7ee9a10fb878f5ffeb3c8b753bbaa35349b69765df
---

# Gmail evidence and checkpoint safety

The ledger foundation has an ingestion transaction that stores source identities, deduplicated pending jobs and the checkpoint together. Manual [Gmail evidence retrieval](gmail-evidence.md) is implemented without ledger writes; the separate manual incremental synchronizer is now implemented. The separate [manual ingestion](mail-ingestion.md) path now stores immutable normalized versions and exact-bound jobs without changing checkpoints. The foundation checkpoint primitive still permits legacy unbound jobs; the implemented history path uses a durable retrieval backlog and a separate complete-evidence watermark.

The planned launcher polls incremental history every five minutes. The manual command paginates and expands affected full threads under bounded runs. Include incoming and sent evidence, including already-read mail; read/unread is not the obligation boundary. The implemented initial window is configurable, defaulting to 30 days.

The manual [sync contract](mail-sync.md) separates two frontiers: atomically queue discovered thread IDs before advancing discovery, then atomically save complete evidence/jobs and acknowledge the selected generation. Advance evidence freshness only after history exhaustion and an empty backlog. A discovery cursor alone does not prove complete evidence. A crash must replay evidence without duplicating jobs for the same source fingerprint and policy version. [Expired-cursor recovery](mail-recovery.md) preserves data, captures a fresh anchor and scans recent mail plus all local mapped threads, conservatively covering open obligations. Catch-up and backlog drainage establish scoped freshness while the expired-history gap remains explicit.

Gmail message text is untrusted evidence, not an instruction to the worker. See [classification](classification-policy.md), [ledger](ledger.md), and [Google connection](/providers/google-credentials.md).
