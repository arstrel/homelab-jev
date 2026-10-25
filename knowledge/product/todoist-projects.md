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
  at: 2026-10-25T19:30:09Z
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
    sha256: 4e482cd3b344f06d4eb32aa5314be0efc091b0557f39b94e95a08e4e58afa3fd
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/adapters/todoist-brief.ts
    sha256: 175e6f795d3f62cef8009803e1f974f1bc96655624ce85f0eabf0dba90d45be7
  - path: src/domain/todoist-brief.ts
    sha256: 97e80af779dba85133ded6ac4e92c5b7095da7b32297f6bb1997561e6b660e5e
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/domain/automatic-capture.ts
    sha256: cdb0cc362537a78a7921c615d4bf10238bd512b70a818e7c110f63d9f74f5163
  - path: src/adapters/todoist-capture.ts
    sha256: 73f5770bd2ceb8d8f74f0e9bbfa4730c012187defc625ca344771d4336f74dba
  - path: docs/automatic-todoist-capture.md
    sha256: 8d54de7da56aef47f136f8eb9bc43331a691d155cd1b5f2e404d36bc944de0a3
---

# Existing project routing and task kinds

Use active project IDs and descriptions discovered at runtime, not hardcoded name matches. The October 4 inventory includes Technical & Career, Personal Projects, Home & Admin, Masonry & Study, People & Social, Explore & Fun, Fitness & Health and Inbox. These names are historical context; projects may be renamed or archived.

Confident actionable obligations can go into an existing themed project. Actionable candidates with uncertain destination go to Inbox with review context. FYI/noise does not create a task. Retro is excluded as a destination using its configured identity. If a destination disappears, use the specified fallback; do not recreate archived projects.

Separate finite obligations from broad goals and reusable activity options. A fitness or leisure option is not necessarily mandatory or consumed by one session. The `Assistant` label is a convention, not ownership or completion evidence.

See [manual edits](/architecture/manual-edits.md), [uncertainty](/architecture/uncertainty.md), and [Retro](/architecture/retro-feedback.md).

The implemented [manual reviewed task flow](/providers/todoist-boundary.md) offers one source-supported task per stored conversation after an independent required-obligation judgment, finite current project choices and Inbox on uncertain routing. Generic review links/notifications use their source subject in the title. Samples prioritize message time rather than retrieval time. Retro is excluded by name, optional configured ID and captured review identity. Apply requires explicit candidate approval and rejects a changed name/ID instead of silently rerouting. Automatic capture and broader task-kind synchronization remain planned.

Owner preference: routine GitHub PR opens/comments/review requests are handled in GitHub and should not duplicate work in Todoist; routine Google Cloud terms updates also produce no task. Deterministic sender/subject exclusions enforce these categories before model calls and again on apply. Marking those PR emails read is a separate Gmail operation, not completion of a Todoist obligation.

The manual [Drive brief](/architecture/planner-handoff.md) now reads current task inventory by active project with task links and existing due values. Retro remains outside the actionable list; optional activities remain copied source data. Exact Gmail source-link associations can mark an email action already tracked, without claiming semantic equivalence, completion or full coverage. Fetching again reflects current returned names, placement and open status. The Drive artifact is a bounded observation; Todoist stays authoritative.

Optional manual [Retro review](/architecture/retro-feedback.md) now judges finite actions, reusable activities and broad goals from current candidate titles. A rowing session preserves the activity option, progress preserves the broad goal, and source recurrence always keeps future occurrences available. Specific supported finite completion is only a review suggestion; there is no completion/write integration.

The opt-in automatic pilot now checks durable mappings, exact supported Gmail references and bounded semantic choices before creating source-supported tasks in existing themed projects. Retro is excluded by resolved identity; uncertain/Inbox routing stays review-only. No task fields, dates, labels or completion are changed. Source-time enablement and a rolling three-intent cap bound rollout. Open plus 30-day completed matching is bounded, not an all-time task inventory. The reviewed pilot was activated October 25 with a fresh source-time boundary and a real timer/publication check. Zero post-boundary sources were available, so useful live capture and broader lifecycle acceptance remain open. See docs/automatic-todoist-capture.md.
