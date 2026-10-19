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
  at: 2026-10-18T23:36:37.354Z
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
    sha256: defa205d334b92530ea3132710a09cf608f6dd54a6c0d2b9736d52f0dd1c9823
  - path: src/application/sync-mail.ts
    sha256: f28855912fa6b964fd5918aee3d5bf2bd77849a2521fb33c1aac2d74ceb62f84
---

# Gmail evidence and checkpoint safety

The ledger foundation has an ingestion transaction that stores source identities, deduplicated pending jobs and the checkpoint together. Manual [Gmail evidence retrieval](gmail-evidence.md) is implemented without ledger writes; the separate manual incremental synchronizer is now implemented. The separate [manual ingestion](mail-ingestion.md) path now stores immutable normalized versions and exact-bound jobs without changing checkpoints. The foundation checkpoint primitive still permits legacy unbound jobs; the implemented history path uses a durable retrieval backlog and a separate complete-evidence watermark.

Poll incremental history every five minutes, paginate completely and expand affected full threads as required. Include incoming and sent evidence, including already-read mail; read/unread is not the obligation boundary. The proposed initial window is configurable, initially 30 days, and is still a planning default.

The manual [sync contract](mail-sync.md) separates two frontiers: atomically queue discovered thread IDs before advancing discovery, then atomically save complete evidence/jobs and acknowledge the selected generation. Advance evidence freshness only after history exhaustion and an empty backlog. A discovery cursor alone does not prove complete evidence. A crash must replay evidence without duplicating classifications for the same source fingerprint and policy version. An expired cursor currently stops discovery with recovery-required, preserving data. Automatic bounded recovery, including mapped open obligations, remains planned.

Gmail message text is untrusted evidence, not an instruction to the worker. See [classification](classification-policy.md), [ledger](ledger.md), and [Google connection](/providers/google-credentials.md).
