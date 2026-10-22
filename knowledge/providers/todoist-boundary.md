---
type: Contract
title: Todoist identity and adapter contract
description: Current SDK reads and request IDs support a planned authoritative-task synchronization loop.
tags:
  - providers
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T04:37:01.220Z
stale_after: "2026-11-10T02:21:58Z"
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
    sha256: 991923e7038efc1870c2e9c795e9639d4366619dccd4fe00fb59e80ea1d1d212
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/adapters/todoist-brief.ts
    sha256: f60bf9703a34d30580fce1c1569a705e0cd98b5a3c12d8146666c81f4586412e
  - path: src/domain/todoist-brief.ts
    sha256: 4516ae5f375c3c5211c0b57a948391ad34bb40127aaa8744a1f585753fdb12b0
  - path: docs/email-brief.md
    sha256: c40b3cd8e7bb03361dfd5c35205ca8d51671d077b86dad2699a715b761725354
  - path: docs/todoist-brief-evidence.md
    sha256: a5a4c60b65336f51012956db6fa2ec942a1b8467fedd042a4235dd9ee06b643f
---

# Todoist identity and adapter contract

The worker currently uses its own `TODOIST_API_TOKEN`. The SDK connection check reads one page of projects. OAuth is not currently implemented or required for this single-account token setup. Do not imply the ChatGPT Todoist connection supplies credentials to Node.

Project names and descriptions can change. Runtime discovery constrains reviewed routing to active IDs and excludes Retro. The manual task adapter reads at most five pages of 100 projects and rejects an incomplete inventory; the separate bounded diagnostic page is not a complete inventory sync. Full task synchronization/reconciliation remains planned; bounded read-only brief context is described below.

The implemented [reviewed task flow](/product/todoist-projects.md) paginates active project discovery and creates explicitly selected tasks using a saved caller `X-Request-Id`, Gmail source link and stable source marker. Transport failures do not trigger SDK replay. Ambiguous creates block subsequent creation and require manual inspection; full task synchronization and automated reconciliation remain planned. Follow [remote write safety](/architecture/remote-write-safety.md), [manual edits](/architecture/manual-edits.md), and [project routing](/product/todoist-projects.md).

The manual [Drive brief](/architecture/planner-handoff.md) adds bounded read-only task context: at most five 100-project pages and two 100-task pages using the existing SDK/transport and shared cancellation budget. It excludes inactive projects, closed/deleted items and Retro, deduplicates IDs and reports omitted unknown-project tasks. API/schema/cursor failures become unavailable context, not an empty successful list. Partial page coverage remains explicit. This read path never creates or completes tasks and never treats a source-link association as completion.
