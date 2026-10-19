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
  at: 2026-10-19T03:47:14.126040Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: gmail-thread-api
    resource: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get
    title: Google full thread API
x_jev_sources:
  - path: src/domain/mail-evidence.ts
    sha256: 120ff9656cf78c96db59945cf8a928063035a0ed4ed3ea131d2c73cc214f509e
  - path: src/application/preview-mail.ts
    sha256: 6c34e71ff2426ced89c2677a8f5662e7a341a72a98a38dd19b63678d0d52260a
  - path: src/application/mail-budget.ts
    sha256: d39ba17773481f6397b8bbfd6c6ff492fe636ac75daaf4721b470d1824098382
  - path: src/adapters/gmail.ts
    sha256: 68d953c97b4a72d3d635679d3764e1212272a6ccab899997a8c427c576618da4
  - path: src/adapters/gmail-body.ts
    sha256: 11b9a39eb999a71b903a79b3ab21c6937b9b3598686f56e0b0c63a43bb2f717e
  - path: docs/gmail-preview.md
    sha256: 781fe09ad868c071241c56483f8563034965ef69ee07e7f81fc354ed94c591ae
---

# Bounded Gmail conversation evidence

The manual `mail:preview` command discovers a fixed recent window, including read/archived and sent mail, and retrieves full non-draft conversation context. Preview produces source-linked evidence and observations in memory and reports sanitized counts only. The default 20-thread selection is a sample; pagination, deadlines and body coverage are reported explicitly. It does not advance a checkpoint, claim worker freshness, classify mail or write Gmail/Todoist/Drive/PostgreSQL state.

The Gmail adapter validates identities/timestamps, decodes supported primary text and separately stored text parts, preserves older context and records document-attachment metadata without reading its contents. Valid signed epoch timestamps are preserved and messages sort chronologically. Supplemental unsupported media such as inline calendar parts remain unread attachment metadata. Empty, unavailable, unsupported and oversized bodies stay distinct. Nested encrypted body containers propagate partial coverage through mixed sections; readable alternatives remain usable. HTML conversion executes nothing and fetches no assets. Shared time/request/concurrency/byte/MIME limits make partial evidence visible. Current implementation is identified by the repository snapshots above; the provider URL describes its external contract.

Preview, ingestion and incremental sync share whole-thread eligibility: any non-draft Spam/Trash message excludes the conversation. Recent-window discovery additionally requires a recent non-draft message; history and mapped recovery can retain older threads.

Actual decoded bytes enforce body limits independently of provider size metadata. Live diagnosis found complete UTF-8 bodies slightly longer than Gmail's declared count; normalization now retains all delivered text in that case. Shorter-than-declared bodies remain unsupported as possible truncation. Inline and separately stored text use the same check; transport, fatal decoding and actual-byte bounds remain enforced.

Pure v1 fingerprints cover complete normalized material, with canonical message/address/attachment order. Labels, read state, observation time, history IDs and decision policy are excluded. Partial bodies receive no complete fingerprint. A thread is evidence, not necessarily one obligation. See [layers](layers.md), [checkpoint safety](gmail-checkpoints.md), [uncertainty](uncertainty.md), and [private-data boundaries](/operations/secret-handling.md).

The bounded live sample retrieved 20 conversations, with 17 complete bodies and three partial (one unsupported, two oversized), and no downstream writes. This demonstrates retrieval/coverage reporting, not full synchronization or classification quality. The separate [durable ingestion](mail-ingestion.md) path now stores immutable complete versions bound to jobs; preview retains its in-memory boundary. Manual [history synchronization](mail-sync.md) and [bounded recovery](mail-recovery.md) are implemented; classification remains planned. See [ledger](ledger.md) and [evaluation](/operations/classification-evaluation.md).

The reader also exposes bounded profile/history operations for [manual sync](mail-sync.md). Preview still performs no persistent writes; history-expired is a distinct fixed category from a missing full thread.
