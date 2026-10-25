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
  at: 2026-10-25T20:32:10Z
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
    sha256: a5069d9ab2ebc61ee4aacdb855e90be35208537a22b8e5dd844d94a762f00d15
  - path: src/domain/email-brief.ts
    sha256: 79fda7c5e18a320cf9826caa82ae869a8bdce327b19a48e676203c46695667c5
  - path: src/application/email-brief.ts
    sha256: 1b5ac51f57c8411e7bf5d48e2249ccf039214ffd856e99be1724d70e6cf98963
  - path: src/adapters/postgres/email-brief.ts
    sha256: 480be952ed744105755a955e58e636d77d0269bb54d198f5a8a2b99764009e19
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
    sha256: c4a537b431f04fdb62de90594b2f6a30d2fc11e000ed4af6ecfda0b68c0b57ce
  - path: src/cli-email-brief.ts
    sha256: ebfa4658d425f12aeaeef605cadc7b08e4cd6712bff06ddcd654c2c6128ec38d
  - path: deploy/brief-refresh.md
    sha256: 11683cc53fce5817189291ddc34e7d0c4e03f0c09d56f68ead4f5bf07486a46e
  - path: docs/automatic-mail-classification.md
    sha256: 6ed7e95d4dfe5a520a837ad8c62aac969e6ff7674e8ed071a4de86ffee2de9ce
  - path: docs/automatic-capture-evidence.md
    sha256: ba920263f6910dd41b2d633734aad3b5e7f40baeab0bc0da999b3acad7c1e242
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# Drive snapshot and planner freshness

## Implemented email and Todoist context publication

The manual brief:publish command creates one private app-owned jev-current.md in Drive, reusing the existing classifications and write-intent tables. It selects current complete stored conversations by latest message time, applies owner exclusions before Jev and saves validated typed decisions by evidence/directions/model/policy identity. Unchanged replay reuses decisions; failed cases remain visible and retryable. No migration or collector redeployment is required.

The templated artifact has Action, FYI, Noise, Waiting, Uncertain/review and owner-exclusion sections. Escaped subjects and Gmail links preserve inspectability without publishing message bodies or address lists. It records generation, sample/window/eligible counts, source observations, pending retrievals and gaps. Model judgments are uncalibrated. Current Todoist context, recent Retro feedback and optional typed review are described below; Calendar context remains absent.

Reserve a Drive-generated file ID durably before creation. Every explicit retry resolves that same ID; expected name/type/app ownership and generation/content read-back are required before success. A failed update preserves prior confirmed publication metadata in storage, although remote bytes may already have changed. Never replace a confirmed missing file or search by name automatically. A separate publisher lock leaves collection independent; no providers run inside SQL transactions. See [ledger](ledger.md) and [Jev boundary](/providers/jev-boundary.md).

## Scheduled handoff and remaining acceptance

A separate LaunchAgent refreshes the existing owned file every five minutes; the initial cached-only handoff was later upgraded with bounded pending classification. Both existing daily prompts receive the versioned freshness/fallback handoff after exact-file/live-source probes and private backups. October 23 scheduled retrieval is observed; the owner-approved October 25 canonical JSON repair and exact readback complete this isolated handoff acceptance. Preserve Daily Life Plan, Daily Inbox Digest and user retrospectives. Generation time never advances source freshness.

The installed prompt appendix uses a 15-minute publication cutoff and checks source freshness independently. Actual scheduled retrieval must select the latest generation and current Todoist inventory, disclose stale/unavailable input and follow an explicit fallback. Calendar blocks help choose actions; they do not authorize writes or prove completion. Verify retrieval before changing prompts. See [personal brief loop](/product/personal-brief-loop.md), [uncertainty](uncertainty.md), and [Retro](retro-feedback.md).

The historical initial live sample published ten conversations (six Jev judgments, four owner exclusions), then replayed all ten cached decisions with zero new requests against the same private file. Independent read-back checked identity, generation and private sharing. The source snapshot still had retrieval gaps and null complete freshness; this proves publication/reuse only, not planner integration or classifier quality.

The same manual brief now fetches current Todoist projects and open tasks on every publication. It groups escaped source titles, task links and existing due values, excluding Retro by configured identity or normalized name. Exact supported primary-account Gmail links on displayed open task descriptions add already-tracked annotations to email Action items; similar wording and absent links establish nothing. Descriptions remain local. Read interval, page caps, missing-project and display-size gaps are explicit; failed reads discard partial contents and publish unavailable context with exit 1. There is no separate database task inventory or new hosted judgment.

## Retro in the same manual artifact

Recent read-only Retro feedback and optional typed review now appear in the same owned Drive file. A fixed seven-day source window includes completed tasks and bounded comments; timestamps describe provider records, not inferred activity dates. Source/candidate/display gaps remain explicit. --retro-review shares email's new-call allowance and publishes ephemeral finite task-kind/candidate/relation/excerpt choices, subject to conservative review rules. No task is completed or edited. Context-only replay refreshes sources with no new Retro inference and removes prior interpretations. Regular context refresh makes no new Retro inference; actual daily-consumer retrieval has since been accepted separately. See [Retro](retro-feedback.md).

Approved live Retro verification confirmed the same private owned file, generation/content read-back and owner-only sharing. Ten records were reviewed against 43 current task titles; all remained uncertain and source coverage stayed explicitly incomplete. A zero-call source refresh preceded the final Retro-focused artifact, whose labelled verification scope deliberately omits new email selection/inference. This is publication evidence, not scheduled planner or semantic matching acceptance. See docs/retro-brief-evidence.md.

The October 22 scheduled-handoff rollout activates cached-only five-minute publication and appends the same freshness/source-authority contract to the existing prompts after private backups. The email scheduler test retained actual generation provenance. The first planner test did not; a repeat with clarified reporting returned the current publisher generation, while retaining a null exact fetch time and direct-source fallback. The existing planner could not save its updated daily artifact through the connected Drive operation and reported that gap. October 23 daily runs independently saved all three canonical artifacts and used matching publisher generations; the earlier planner save limitation did not recur in that run. The owner-approved October 25 repair removed only orphaned duplicate lines outside named fields; the complete canonical Run record now parses and the full document matched independent readback. This closes the isolated handoff acceptance while broader classification/reconciliation requirements remain open. The repository report docs/scheduled-brief-evidence.md distinguishes these surfaces.

The automatic classification upgrade adds --classify-pending before cached publication. The display and Retro paths remain --max-new 0; preprocessing has separate request/token counters and a durable $2 lifetime cap. The merged template is now active, while prior scheduled handoff evidence describes the initial cached-only rollout. See docs/automatic-mail-classification.md.

The merged PR #23 classifier was activated and verified on a genuine October 25 timer cycle, with independent readback of the exact owned Drive file. Retrieval was complete at observation; classification and Retro gaps remained explicit. Opt-in task capture adds per-source processing history and cycle counts/review/failure/cap/ambiguity disclosures to the same artifact. Historical matching never establishes current completion; live Todoist remains authoritative. Capture was enabled on October 25; a genuine timer generation and exact owned-file/counter readback passed with zero eligible new sources. The PR #26 template correction is deployed and independently read back; capture-enabled documents now refer to capture outcomes instead of a blanket no-write claim. See docs/automatic-capture-evidence.md and docs/automatic-todoist-capture.md.
