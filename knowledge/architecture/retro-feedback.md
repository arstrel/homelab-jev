---
type: Policy
title: Retro interpretation and reusable inventory
description: Use daily feedback without consuming broad goals or recurring activity options.
tags:
  - architecture
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-11T02:21:58Z"
stale_after: "2026-11-10T02:21:58Z"
x_jev_delivery: planned
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: fafbb4a836edbd853c451fd4e428f097086b8e55be24856d0feaafd66e7efcda
  - path: openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
    sha256: 6dbc33bf41d370c7822aac9b680dbeb82120944abeb56dbc6cfe898c41e15e51
---

# Retro interpretation and reusable inventory

Retro is user-authored feedback and read-only for the worker. It is not an email-task destination. Treat entries as evidence of what happened, rather than commands to close arbitrary tasks.

Separate finite obligations, broad goals and reusable activity options. A rowing session may support a specific completed-session candidate; it does not consume the general option to row tomorrow. Broad feedback such as "exercise went well" cannot close every Fitness & Health item.

Surface specific reconciliation candidates when task identity and completion evidence are credible. Preserve reusable inventory and uncertain cases. Never use yesterday's generated plan as proof of completion. Synchronize with current Todoist state and follow [manual edit rules](manual-edits.md).

See [project task kinds](/product/todoist-projects.md), [planner handoff](planner-handoff.md), and [uncertainty](uncertainty.md).
