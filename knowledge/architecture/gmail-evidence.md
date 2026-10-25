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
  at: 2026-10-25T17:01:28Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: gmail-thread-api
    resource: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get
    title: Google full thread API
x_jev_sources:
  - path: src/domain/mail-evidence.ts
    sha256: b014980d2e99ac35da00dba3f71070b26e6a52216722110d3a86476d1cd93703
  - path: src/application/preview-mail.ts
    sha256: a04b1556a028c8e4d8d27100d7ca75900865f5bf5bd2868a4be6544761415fea
  - path: src/application/mail-budget.ts
    sha256: d39ba17773481f6397b8bbfd6c6ff492fe636ac75daaf4721b470d1824098382
  - path: src/adapters/gmail.ts
    sha256: 87224a07d772828108d8ce67b295a22a1656802327116f63a750c280bafca0ae
  - path: src/adapters/gmail-body.ts
    sha256: fc9fbf3315c7bbc1c8feb9d6bb2ce9049ce71eaeeee6a9c8b1b5de61613b5a0d
  - path: docs/gmail-preview.md
    sha256: 282e6eaa1fea787e4b31906bfd5590131a707e1d6edd820d37bc28274ef0609a
  - path: docs/automatic-mail-classification.md
    sha256: a01b30b6e55c7f81b1d1f4d332b7833955a236b90ab3b577e97e494310d323a0
---

# Bounded Gmail conversation evidence

The manual `mail:preview` command discovers a fixed recent window, including read/archived and sent mail, and retrieves full non-draft conversation context. Preview produces source-linked evidence and observations in memory and reports sanitized counts only. The default 20-thread selection is a sample; pagination, deadlines and body coverage are reported explicitly. It does not advance a checkpoint, claim worker freshness, classify mail or write Gmail/Todoist/Drive/PostgreSQL state.

The Gmail adapter validates identities/timestamps, decodes supported primary text and separately stored text parts, preserves older context and records document-attachment metadata without reading its contents. Valid signed epoch timestamps are preserved and messages sort chronologically. Supplemental unsupported media such as inline calendar parts remain unread attachment metadata. Empty, unavailable, unsupported and oversized bodies stay distinct. Nested encrypted body containers propagate partial coverage through mixed sections; readable alternatives remain usable. HTML conversion executes nothing and fetches no assets. Shared time/request/concurrency/byte/MIME limits make partial evidence visible. Current implementation is identified by the repository snapshots above; the provider URL describes its external contract.

Preview, ingestion and incremental sync share whole-thread eligibility: any non-draft Spam/Trash message excludes the conversation. Recent-window discovery additionally requires a recent non-draft message; history and mapped recovery can retain older threads.

Actual decoded bytes enforce body limits independently of provider size metadata. Live diagnosis found complete UTF-8 bodies slightly longer than Gmail's declared count; normalization now retains all delivered text in that case. Shorter-than-declared representations remain unsupported as possible truncation; a complete HTML MIME alternative can supply the body without accepting that short representation. Inline and separately stored text use the same check; transport, fatal decoding and actual-byte bounds remain enforced.

Pure v1 fingerprints cover complete normalized material, with canonical message/address/attachment order. Labels, read state, observation time, history IDs and decision policy are excluded. Partial bodies receive no complete fingerprint. A thread is evidence, not necessarily one obligation. See [layers](layers.md), [checkpoint safety](gmail-checkpoints.md), [uncertainty](uncertainty.md), and [private-data boundaries](/operations/secret-handling.md).

The bounded live sample retrieved 20 conversations, with 17 complete bodies and three partial (one unsupported, two oversized), and no downstream writes. This demonstrates retrieval/coverage reporting, not full synchronization or classification quality. The separate [durable ingestion](mail-ingestion.md) path now stores immutable complete versions bound to jobs; preview retains its in-memory boundary. Manual [history synchronization](mail-sync.md) and [bounded recovery](mail-recovery.md) are implemented; classification remains planned. See [ledger](ledger.md) and [evaluation](/operations/classification-evaluation.md).

The reader also exposes bounded profile/history operations for [manual sync](mail-sync.md). Preview still performs no persistent writes; history-expired is a distinct fixed category from a missing full thread.

Gmail request starts now use one invocation-local queue with a 1.5-second minimum gap. Structured HTTP 429 or known HTTP 403 rate-limit reasons stop the reader as `rate-limited`; body normalization preserves the signal. Preview stops new selection after throttling while retaining already-started successful evidence. Waiting shares cancellation/deadline limits. Other clients/processes are outside this pacing scope.

HTML conversion now has an independent 200-level DOM limit; MIME nesting stays at 20. Ordinary email table layouts previously hit the shared shallow depth bound and were retried indefinitely. Byte and child-node truncation limits remain enforced. Complete alternatives preserve mandatory mixed sections and encrypted gaps. The October 25 bounded live retry cleared all 101 pending retrievals and advanced actual evidence freshness; recurring rollout remains a merged-release step. See docs/automatic-mail-evidence.md for scope and counts.
