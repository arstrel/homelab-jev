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
  at: 2026-10-25T18:27:08Z
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
  - path: src/application/capture-mail.ts
    sha256: 182ee519a613a3e87adee05bdba8f86dca632348dd12b47679c1276dc2259573
  - path: src/adapters/postgres/automatic-capture.ts
    sha256: 3656d23083bbbff8243784295bf21be29568679ad212c08d6201a341925f3b42
  - path: docs/automatic-todoist-capture.md
    sha256: fcdfa9ddc123dc963b3968d753d9a0273f2060f289eb2c4eba3e681f776074ab
---

# Preserve manual task changes

Todoist is authoritative. Discover current task state before proposing worker updates. Preserve manual title, project, date, content, labels and completion changes according to the specified per-field override policy. Operate on mapped worker-owned tasks; never infer ownership from the `Assistant` label alone.

A user move or edit must survive subsequent email replay. A completed or deleted task creates suppression evidence so unchanged source versions do not resurrect it. Respect a manually chosen project even when a later model judgment prefers another project.

A sent reply may support a waiting state; inferred email resolution can produce a suggestion, never automatic completion in the first release. A calendar plan or a broad Retro statement does not prove a concrete task was finished.

See [remote write safety](remote-write-safety.md), [project routing](/product/todoist-projects.md), and [Retro](retro-feedback.md).

This capture pilot preserves all existing remote fields by exposing only inventory reads and task creation. Durable source mappings prevent recreation after edits, completion or deletion. Matches to existing user tasks are associations, explicitly recorded as not worker-owned; no future update authority follows from a link. General per-field override detection, waiting transitions and lifecycle writes remain planned. See the repository runbook docs/automatic-todoist-capture.md.
