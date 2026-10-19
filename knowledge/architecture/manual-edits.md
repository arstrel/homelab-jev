---
type: Invariant
title: Preserve manual task changes
description: User task edits and completion override worker inference.
tags:
  - architecture
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-11T02:21:58Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: planned
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
---

# Preserve manual task changes

Todoist is authoritative. Discover current task state before proposing worker updates. Preserve manual title, project, date, content, labels and completion changes according to the specified per-field override policy. Operate on mapped worker-owned tasks; never infer ownership from the `Assistant` label alone.

A user move or edit must survive subsequent email replay. A completed or deleted task creates suppression evidence so unchanged source versions do not resurrect it. Respect a manually chosen project even when a later model judgment prefers another project.

A sent reply may support a waiting state; inferred email resolution can produce a suggestion, never automatic completion in the first release. A calendar plan or a broad Retro statement does not prove a concrete task was finished.

See [remote write safety](remote-write-safety.md), [project routing](/product/todoist-projects.md), and [Retro](retro-feedback.md).
