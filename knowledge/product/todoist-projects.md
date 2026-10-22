---
type: Policy
title: Existing project routing and task kinds
description: Route concrete obligations to active existing projects while
  keeping optional inventory and Retro distinct.
tags:
  - product
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T04:37:01.221Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: src/domain/email-task.ts
    sha256: 0d3f27d05e8b330b028e79fa526f20b9c5b1370df2098cc8478b4b7ad95bcdc2
  - path: src/application/email-tasks.ts
    sha256: b863ceb3d61d8dc0313ae392b1b9502a4a0ebeda6727b4cfdc102f741875cf65
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/adapters/todoist-brief.ts
    sha256: f60bf9703a34d30580fce1c1569a705e0cd98b5a3c12d8146666c81f4586412e
  - path: src/domain/todoist-brief.ts
    sha256: 4516ae5f375c3c5211c0b57a948391ad34bb40127aaa8744a1f585753fdb12b0
  - path: docs/email-brief.md
    sha256: c40b3cd8e7bb03361dfd5c35205ca8d51671d077b86dad2699a715b761725354
---

# Existing project routing and task kinds

Use active project IDs and descriptions discovered at runtime, not hardcoded name matches. The October 4 inventory includes Technical & Career, Personal Projects, Home & Admin, Masonry & Study, People & Social, Explore & Fun, Fitness & Health and Inbox. These names are historical context; projects may be renamed or archived.

Confident actionable obligations can go into an existing themed project. Actionable candidates with uncertain destination go to Inbox with review context. FYI/noise does not create a task. Retro is excluded as a destination using its configured identity. If a destination disappears, use the specified fallback; do not recreate archived projects.

Separate finite obligations from broad goals and reusable activity options. A fitness or leisure option is not necessarily mandatory or consumed by one session. The `Assistant` label is a convention, not ownership or completion evidence.

See [manual edits](/architecture/manual-edits.md), [uncertainty](/architecture/uncertainty.md), and [Retro](/architecture/retro-feedback.md).

The implemented [manual reviewed task flow](/providers/todoist-boundary.md) offers one source-supported task per stored conversation after an independent required-obligation judgment, finite current project choices and Inbox on uncertain routing. Generic review links/notifications use their source subject in the title. Samples prioritize message time rather than retrieval time. Retro is excluded by name, optional configured ID and captured review identity. Apply requires explicit candidate approval and rejects a changed name/ID instead of silently rerouting. Automatic capture and broader task-kind synchronization remain planned.

Owner preference: routine GitHub PR opens/comments/review requests are handled in GitHub and should not duplicate work in Todoist; routine Google Cloud terms updates also produce no task. Deterministic sender/subject exclusions enforce these categories before model calls and again on apply. Marking those PR emails read is a separate Gmail operation, not completion of a Todoist obligation.

The manual [Drive brief](/architecture/planner-handoff.md) now reads current task inventory by active project with task links and existing due values. Retro remains outside the actionable list; optional activities remain copied source data. Exact Gmail source-link associations can mark an email action already tracked, without claiming semantic equivalence, completion or full coverage. Fetching again reflects current returned names, placement and open status. The Drive artifact is a bounded observation; Todoist stays authoritative.
