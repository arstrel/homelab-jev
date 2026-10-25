---
type: Invariant
title: Preserve manual task changes
description: User task edits and completion override worker inference.
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: a5069d9ab2ebc61ee4aacdb855e90be35208537a22b8e5dd844d94a762f00d15
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: src/application/capture-mail.ts
    sha256: 37b80c3e58e80baa801d2856a746e614e971700e537092fa05bd15f9fdc7ce7b
  - path: src/adapters/postgres/automatic-capture.ts
    sha256: 3656d23083bbbff8243784295bf21be29568679ad212c08d6201a341925f3b42
  - path: docs/automatic-todoist-capture.md
    sha256: 8d54de7da56aef47f136f8eb9bc43331a691d155cd1b5f2e404d36bc944de0a3
---

# Preserve manual task changes

Todoist is authoritative for task content, project, dates, descriptions, labels and completion. A label alone does not establish worker ownership. Generated plans and broad Retro statements are not task-completion evidence.

The active create-only capture pilot exposes current inventory reads and task creation, so it preserves every field of existing remote tasks. Persistent source mappings prevent recreation of mapped obligations after edits, completion or deletion. Links to existing user tasks record association without granting ownership or future update authority. Bounded matching is not an all-time guarantee for unmapped completed/deleted work.

The broader target still requires recording user corrections and per-field overrides before lifecycle updates. A sent reply may support waiting; inferred resolution stays a sourced suggestion and never automatically completes a task. Those lifecycle/correction operations remain unimplemented, and parent 4.5 stays open for its full reconciliation acceptance despite the delivered create-only preservation.

See [write safety](remote-write-safety.md), [project routing](/product/todoist-projects.md), [Retro](retro-feedback.md) and the repository's automatic-todoist-capture runbook.
