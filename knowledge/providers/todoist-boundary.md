---
type: Contract
title: Todoist identity and adapter contract
description: Current SDK reads and request IDs support a planned
  authoritative-task synchronization loop.
tags:
  - providers
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T20:58:36Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/todoist.ts
    title: src/adapters/todoist.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/connections.md
    title: docs/connections.md
x_jev_sources:
  - path: src/adapters/todoist.ts
    sha256: 893a433a2878b505872f14719cced7bfede0521b4c505e203de0b9e1fda749a3
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: docs/connections.md
    sha256: f887016114368f775e58c0c7945b8117f9ee016483a4e730842c8a06bdb196c8
  - path: src/adapters/todoist-email-tasks.ts
    sha256: eb6b83f43f2356170da714586b72c80f1deb5e8add45d25f95392489115f4937
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/adapters/todoist-brief.ts
    sha256: 175e6f795d3f62cef8009803e1f974f1bc96655624ce85f0eabf0dba90d45be7
  - path: src/domain/todoist-brief.ts
    sha256: 97e80af779dba85133ded6ac4e92c5b7095da7b32297f6bb1997561e6b660e5e
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: docs/todoist-brief-evidence.md
    sha256: a5a4c60b65336f51012956db6fa2ec942a1b8467fedd042a4235dd9ee06b643f
  - path: src/adapters/todoist-retro.ts
    sha256: e4f8df66104ea1740daa923cf4ca61bc607df35a3de6792518eb5a065a3d1cbe
  - path: src/adapters/todoist-capture.ts
    sha256: 73f5770bd2ceb8d8f74f0e9bbfa4730c012187defc625ca344771d4336f74dba
  - path: src/application/capture-mail.ts
    sha256: 1ad2014e481f2692dd9ad7c4c045f92b8074d3f150d9f2ed41b0f0b7694cceff
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# Todoist identity and adapter contract

The worker currently uses its own `TODOIST_API_TOKEN`. The SDK connection check reads one page of projects. OAuth is not currently implemented or required for this single-account token setup. Do not imply the ChatGPT Todoist connection supplies credentials to Node.

Project names and descriptions can change. Runtime discovery constrains reviewed routing to active IDs and excludes Retro. The manual task adapter reads at most five pages of 100 projects and rejects an incomplete inventory; the separate bounded diagnostic page is not a complete inventory sync. Full task synchronization/reconciliation remains planned; bounded read-only brief context is described below.

The implemented [reviewed task flow](/product/todoist-projects.md) paginates active project discovery and creates explicitly selected tasks using a saved caller `X-Request-Id`, Gmail source link and stable source marker. Transport failures do not trigger SDK replay. Ambiguous creates block subsequent creation and require manual inspection; full task synchronization and automated reconciliation remain planned. Follow [remote write safety](/architecture/remote-write-safety.md), [manual edits](/architecture/manual-edits.md), and [project routing](/product/todoist-projects.md).

The manual [Drive brief](/architecture/planner-handoff.md) adds bounded read-only task context: at most five 100-project pages and two 100-task pages using the existing SDK/transport and shared cancellation budget. It excludes inactive projects, closed/deleted items and Retro, deduplicates IDs and reports omitted unknown-project tasks. API/schema/cursor failures become unavailable context, not an empty successful list. Partial page coverage remains explicit. This read path never creates or completes tasks and never treats a source-link association as completion.

The publisher also resolves one current active Retro identity and reads bounded open/completed tasks plus comments using the existing read-only transport. It selects a seven-day provider-date window and ten newest source records; caps, skipped comment parents, unread attachments, ambiguous identity and read failures are visible. Other/unknown authors cannot support owner accomplishment. Retro stays outside actionable inventory and is never changed. See [Retro](/architecture/retro-feedback.md).

The capture adapter reuses project discovery and the existing source-marked creation method. It reads at most two 100-item pages each of open and last-30-day completed tasks, fails closed on unfinished pagination or over 100 distinct candidates, and excludes Retro by resolved identity. Descriptions are inspected locally for supported primary-account Gmail references; model context contains only titles/completed hints. Unknown/archived-project tasks can prevent duplicates but cannot become creation destinations. The capture port exposes no remote update, completion, deletion or reopen method. Durable links preserve mapped work even when no longer returned. See docs/automatic-todoist-capture.md.

The configured Retro identity is excluded even when its project is archived, frozen or absent from active discovery; recent completed feedback must not enter matching context.

Capture selects and validates local email work before lazily loading its inventory. Empty or entirely locally skipped/review-only batches make no capture Todoist reads; eligible records share the initial inventory and retain the separate fresh read before semantic linking/creation. Publication independently refreshes its current Todoist/Retro context. This idle-read correction is implemented but awaits merged-release deployment.
