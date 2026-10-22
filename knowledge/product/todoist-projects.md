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
  at: 2026-10-22T01:53:00Z
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
    sha256: ae0b058b9b3670e6140193059a306bd7e5cdf923649b70f5df4db5fdf1d6ec6c
  - path: src/application/email-tasks.ts
    sha256: 62c76aa18efc14e013816b152a1189716d3b085216ac063173565c8117d20962
  - path: docs/email-tasks.md
    sha256: 17f197c991ba5101312db27c84e2e145c4c3d181e319a73f764ae67dbf075a69
---

# Existing project routing and task kinds

Use active project IDs and descriptions discovered at runtime, not hardcoded name matches. The October 4 inventory includes Technical & Career, Personal Projects, Home & Admin, Masonry & Study, People & Social, Explore & Fun, Fitness & Health and Inbox. These names are historical context; projects may be renamed or archived.

Confident actionable obligations can go into an existing themed project. Actionable candidates with uncertain destination go to Inbox with review context. FYI/noise does not create a task. Retro is excluded as a destination using its configured identity. If a destination disappears, use the specified fallback; do not recreate archived projects.

Separate finite obligations from broad goals and reusable activity options. A fitness or leisure option is not necessarily mandatory or consumed by one session. The `Assistant` label is a convention, not ownership or completion evidence.

See [manual edits](/architecture/manual-edits.md), [uncertainty](/architecture/uncertainty.md), and [Retro](/architecture/retro-feedback.md).

The implemented [manual reviewed task flow](/providers/todoist-boundary.md) offers one source-supported task per stored conversation after an independent required-obligation judgment, finite current project choices and Inbox on uncertain routing. Generic review links/notifications use their source subject in the title. Samples prioritize message time rather than retrieval time. Retro is excluded by name, optional configured ID and captured review identity. Apply requires explicit candidate approval and rejects a changed name/ID instead of silently rerouting. Automatic capture and broader task-kind synchronization remain planned.
