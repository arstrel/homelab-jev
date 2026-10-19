---
type: Product
title: The personal brief loop
description: Connect email evidence, visible tasks and daily planning without
  duplicating the task inventory.
tags:
  - product
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-19T02:15:25.562321Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: planned
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
  - path: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    sha256: 6295d7a2e38f5233f274b976d54399a7176e35efb594338e1b1be5973a1fb778
---

# The personal brief loop

The target outcome is a current, source-linked obligation inventory in existing Todoist projects. Gmail contributes evidence; Jev answers bounded interpretation questions; deterministic code applies policy. Daily Inbox Digest explains incoming work. Daily Life Plan selects suitable Todoist actions for upcoming themed calendar blocks.

This loop is planned. The merged foundation connects providers. Manual retrieval and durable ingestion preserve complete evidence and exact-bound jobs. Manual incremental synchronization now queues retrieval work, tracks separate evidence freshness and recovers expired anchors over recent and locally mapped mail. Scheduled operation, classification, task writes and brief publication remain planned.

The worker polls Gmail every five minutes. It publishes a dedicated Drive snapshot for scheduled planners; it does not invoke GPT to generate plans. Planner access to the latest snapshot must be demonstrated in the actual scheduled-task context before relying on this handoff.

See [system ownership](ownership.md), [delivery boundary](delivery-boundary.md), [processing cycle](/architecture/processing-cycle.md), and [planner handoff](/architecture/planner-handoff.md).
