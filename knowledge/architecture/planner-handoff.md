---
type: Contract
title: Drive snapshot and planner freshness
description: Publish worker-owned context with honest source freshness for real
  scheduled planners.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T04:10:40.938Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    sha256: 6295d7a2e38f5233f274b976d54399a7176e35efb594338e1b1be5973a1fb778
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
  - path: src/domain/email-brief.ts
    sha256: dd30c6ba2d7615bc2977f0b9d725fabee5da681c558dd7efb35f6abd03ace95b
  - path: src/application/email-brief.ts
    sha256: a651539dbbc06c8c10a8fef0635f3a53770a12a24e4a0ee9bda78af4bfdd1e30
  - path: src/adapters/postgres/email-brief.ts
    sha256: 21166686962ee9a41f1c7dcc9e240072887895023ef34e5d5869786a6be615ce
  - path: src/adapters/drive-brief.ts
    sha256: 808826c574c8867edfee2ef3aabc700d739a4f6f7dc82f0b6200159c458277b6
  - path: docs/email-brief.md
    sha256: 84a41f112457719b8c35427c994ccb9880305bf6275dd8fd589348ce6b5ad7d6
  - path: openspec/changes/add-drive-email-brief/specs/email-brief-publication/spec.md
    sha256: 67e95288abd3f441c34dc5d5b821a0487855018b833d71ec9e25e20b2b482478
  - path: docs/email-brief-evidence.md
    sha256: bf7d371c90e3028e05719dd8f793e3522b48b5c0bb3d59f10f6b391a6abcce94
---

# Drive snapshot and planner freshness

## Implemented email-only publication

The manual brief:publish command creates one private app-owned jev-current.md in Drive, reusing the existing classifications and write-intent tables. It selects current complete stored conversations by latest message time, applies owner exclusions before Jev and saves validated typed decisions by evidence/directions/model/policy identity. Unchanged replay reuses decisions; failed cases remain visible and retryable. No migration or collector redeployment is required.

The templated artifact has Action, FYI, Noise, Waiting, Uncertain/review and owner-exclusion sections. Escaped subjects and Gmail links preserve inspectability without publishing message bodies or address lists. It records generation, sample/window/eligible counts, source observations, pending retrievals and gaps. Model judgments are uncalibrated. Todoist, Retro and Calendar context are explicitly absent in this slice.

Reserve a Drive-generated file ID durably before creation. Every explicit retry resolves that same ID; expected name/type/app ownership and generation/content read-back are required before success. A failed update preserves prior confirmed publication metadata in storage, although remote bytes may already have changed. Never replace a confirmed missing file or search by name automatically. A separate publisher lock leaves collection independent; no providers run inside SQL transactions. See [ledger](ledger.md) and [Jev boundary](/providers/jev-boundary.md).

## Remaining full planner handoff

The complete planner artifact still needs current Todoist inventory/freshness, Retro context, automatic publication and verified retrieval by real scheduled tasks. Preserve Daily Life Plan, Daily Inbox Digest and user retrospectives. Generation time never advances source freshness.

A configurable 15-minute stale-input cutoff remains a proposed default for the full planner contract. Actual scheduled retrieval must select the latest generation and current Todoist inventory, disclose stale/unavailable input and follow an explicit fallback. Calendar blocks help choose actions; they do not authorize writes or prove completion. Verify retrieval before changing prompts. See [personal brief loop](/product/personal-brief-loop.md), [uncertainty](uncertainty.md), and [Retro](retro-feedback.md).

The authorized live sample published ten conversations (six Jev judgments, four owner exclusions), then replayed all ten cached decisions with zero new requests against the same private file. Independent read-back checked identity, generation and private sharing. The source snapshot still had retrieval gaps and null complete freshness; this proves publication/reuse only, not planner integration or classifier quality.
