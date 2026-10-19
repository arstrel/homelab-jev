---
type: Contract
title: Bounded Gmail conversation evidence
description: Retrieve source-linked text with stable fingerprints and explicit
  partial coverage, without durable ingestion or downstream writes.
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
  - id: gmail-thread-api
    resource: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get
    title: Google full thread API
x_jev_sources:
  - path: src/domain/mail-evidence.ts
    sha256: be0cc7202522ec6a6cf6602b1736584778dabe02a21b04cf00bbe3a04991fe0b
  - path: src/application/preview-mail.ts
    sha256: b2a549824d4ffb064d8e1a4e12783ad357d5fa2cc5d14918d2e2744edaf62f66
  - path: src/application/mail-budget.ts
    sha256: d39ba17773481f6397b8bbfd6c6ff492fe636ac75daaf4721b470d1824098382
  - path: src/adapters/gmail.ts
    sha256: 68d953c97b4a72d3d635679d3764e1212272a6ccab899997a8c427c576618da4
  - path: src/adapters/gmail-body.ts
    sha256: 2f234a8b2799ab8ba14e3b4d530b2de6edfda0e30f4820198351d6782a9114ef
  - path: docs/gmail-preview.md
    sha256: 8f6f30aad95ef131eca6a988b8dbd5a26cc023be8f7e2ec649222d04cd0b2319
---

# Bounded Gmail conversation evidence

The manual `mail:preview` command discovers a fixed recent window, including read/archived and sent mail, and retrieves full non-draft conversation context. Preview produces source-linked evidence and observations in memory and reports sanitized counts only. The default 20-thread selection is a sample; pagination, deadlines and body coverage are reported explicitly. It does not advance a checkpoint, claim worker freshness, classify mail or write Gmail/Todoist/Drive/PostgreSQL state.

The Gmail adapter validates identities/timestamps, decodes supported primary text and separately stored text parts, preserves older context and records document-attachment metadata without reading its contents. Valid signed epoch timestamps are preserved and messages sort chronologically. Supplemental unsupported media such as inline calendar parts remain unread attachment metadata. Empty, unavailable, unsupported and oversized bodies stay distinct. HTML conversion executes nothing and fetches no assets. Shared time/request/concurrency/byte/MIME limits make partial evidence visible. Current implementation is identified by the repository snapshots above; the provider URL describes its external contract.

Pure v1 fingerprints cover complete normalized material, with canonical message/address/attachment order. Labels, read state, observation time, history IDs and decision policy are excluded. Partial bodies receive no complete fingerprint. A thread is evidence, not necessarily one obligation. See [layers](layers.md), [checkpoint safety](gmail-checkpoints.md), [uncertainty](uncertainty.md), and [private-data boundaries](/operations/secret-handling.md).

The bounded live sample retrieved 20 conversations, with 17 complete bodies and three partial (one unsupported, two oversized), and no downstream writes. This demonstrates retrieval/coverage reporting, not full synchronization or classification quality. The separate [durable ingestion](mail-ingestion.md) path now stores immutable complete versions bound to jobs; preview retains its in-memory boundary. History synchronization and classification remain planned. See [ledger](ledger.md) and [evaluation](/operations/classification-evaluation.md).

The reader also exposes bounded profile/history operations for [manual sync](mail-sync.md). Preview still performs no persistent writes; history-expired is a distinct fixed category from a missing full thread.
