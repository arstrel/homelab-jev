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
  at: 2026-10-22T16:14:17.896Z
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
    sha256: 8ce409f2ead0df548d76472e94994940913ebcc21549e10d642da992987be9fa
  - path: src/application/email-brief.ts
    sha256: 14cefe6cfebfe20a1cafcc99e26f6cba0cc4926060826587ec92d6d64bc2240e
  - path: src/adapters/postgres/email-brief.ts
    sha256: 21166686962ee9a41f1c7dcc9e240072887895023ef34e5d5869786a6be615ce
  - path: src/adapters/drive-brief.ts
    sha256: 808826c574c8867edfee2ef3aabc700d739a4f6f7dc82f0b6200159c458277b6
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: openspec/changes/add-drive-email-brief/specs/email-brief-publication/spec.md
    sha256: 67e95288abd3f441c34dc5d5b821a0487855018b833d71ec9e25e20b2b482478
  - path: docs/email-brief-evidence.md
    sha256: bf7d371c90e3028e05719dd8f793e3522b48b5c0bb3d59f10f6b391a6abcce94
  - path: src/domain/todoist-brief.ts
    sha256: 97e80af779dba85133ded6ac4e92c5b7095da7b32297f6bb1997561e6b660e5e
  - path: src/adapters/todoist-brief.ts
    sha256: 175e6f795d3f62cef8009803e1f974f1bc96655624ce85f0eabf0dba90d45be7
  - path: src/domain/brief-text.ts
    sha256: 18b4b488bbcc7624c840e9d43503c61c47fe801438c9d3e99e143f29b75a08b2
  - path: docs/todoist-brief-evidence.md
    sha256: a5a4c60b65336f51012956db6fa2ec942a1b8467fedd042a4235dd9ee06b643f
  - path: docs/retro-brief-evidence.md
    sha256: 078d68a8fdb76a6c9d588819586191fade8f6ea535dbcbae24341fc8e9cec354
---

# Drive snapshot and planner freshness

## Implemented email and Todoist context publication

The manual brief:publish command creates one private app-owned jev-current.md in Drive, reusing the existing classifications and write-intent tables. It selects current complete stored conversations by latest message time, applies owner exclusions before Jev and saves validated typed decisions by evidence/directions/model/policy identity. Unchanged replay reuses decisions; failed cases remain visible and retryable. No migration or collector redeployment is required.

The templated artifact has Action, FYI, Noise, Waiting, Uncertain/review and owner-exclusion sections. Escaped subjects and Gmail links preserve inspectability without publishing message bodies or address lists. It records generation, sample/window/eligible counts, source observations, pending retrievals and gaps. Model judgments are uncalibrated. Current Todoist context, recent Retro feedback and optional typed review are described below; Calendar context remains absent.

Reserve a Drive-generated file ID durably before creation. Every explicit retry resolves that same ID; expected name/type/app ownership and generation/content read-back are required before success. A failed update preserves prior confirmed publication metadata in storage, although remote bytes may already have changed. Never replace a confirmed missing file or search by name automatically. A separate publisher lock leaves collection independent; no providers run inside SQL transactions. See [ledger](ledger.md) and [Jev boundary](/providers/jev-boundary.md).

## Scheduled handoff and remaining acceptance

A separate cached-only LaunchAgent refreshes the existing owned file every five minutes. Both existing daily prompts receive the versioned freshness/fallback handoff after exact-file/live-source probes and private backups. Actual clock-triggered consumer acceptance remains pending until observed. Preserve Daily Life Plan, Daily Inbox Digest and user retrospectives. Generation time never advances source freshness.

The installed prompt appendix uses a 15-minute publication cutoff and checks source freshness independently. Actual scheduled retrieval must select the latest generation and current Todoist inventory, disclose stale/unavailable input and follow an explicit fallback. Calendar blocks help choose actions; they do not authorize writes or prove completion. Verify retrieval before changing prompts. See [personal brief loop](/product/personal-brief-loop.md), [uncertainty](uncertainty.md), and [Retro](retro-feedback.md).

The authorized live sample published ten conversations (six Jev judgments, four owner exclusions), then replayed all ten cached decisions with zero new requests against the same private file. Independent read-back checked identity, generation and private sharing. The source snapshot still had retrieval gaps and null complete freshness; this proves publication/reuse only, not planner integration or classifier quality.

The same manual brief now fetches current Todoist projects and open tasks on every publication. It groups escaped source titles, task links and existing due values, excluding Retro by configured identity or normalized name. Exact supported primary-account Gmail links on displayed open task descriptions add already-tracked annotations to email Action items; similar wording and absent links establish nothing. Descriptions remain local. Read interval, page caps, missing-project and display-size gaps are explicit; failed reads discard partial contents and publish unavailable context with exit 1. There is no separate database task inventory or new hosted judgment.

## Retro in the same manual artifact

Recent read-only Retro feedback and optional typed review now appear in the same owned Drive file. A fixed seven-day source window includes completed tasks and bounded comments; timestamps describe provider records, not inferred activity dates. Source/candidate/display gaps remain explicit. --retro-review shares email's new-call allowance and publishes ephemeral finite task-kind/candidate/relation/excerpt choices, subject to conservative review rules. No task is completed or edited. Context-only replay refreshes sources with no new Retro inference and removes prior interpretations. Cached-only automatic publication is active; actual timer-triggered planner retrieval remains a separate acceptance check. See [Retro](retro-feedback.md).

Approved live Retro verification confirmed the same private owned file, generation/content read-back and owner-only sharing. Ten records were reviewed against 43 current task titles; all remained uncertain and source coverage stayed explicitly incomplete. A zero-call source refresh preceded the final Retro-focused artifact, whose labelled verification scope deliberately omits new email selection/inference. This is publication evidence, not scheduled planner or semantic matching acceptance. See docs/retro-brief-evidence.md.

The October 22 scheduled-handoff rollout activates cached-only five-minute publication and appends the same freshness/source-authority contract to the existing prompts after private backups. The email scheduler test retained actual generation provenance. The first planner test did not; a repeat with clarified reporting returned the current publisher generation, while retaining a null exact fetch time and direct-source fallback. The existing planner could not save its updated daily artifact through the connected Drive operation and reported that gap. Actual clock-triggered daily acceptance remains pending. The repository report docs/scheduled-brief-evidence.md distinguishes these surfaces.
