---
type: Rule
title: Authority and data ownership
description: Keep Todoist as the task UI and PostgreSQL as a processing ledger.
tags:
  - product
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-18T06:27:12.783Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: aa3618c539140b7993e86e1740221eae20af1824514f0ae78b1b6fb1e48e0a2d
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 1ae7c84b9957c1449c1f66a4e192f822883abcd15353e29e825987b06be1a479
---

# Authority and data ownership

Gmail owns original messages and threads. Todoist owns visible task content, projects, dates and completion. Retro owns user-authored feedback. Calendar supplies commitments and available blocks to the planner. Drive holds plans, digests, retrospectives and the dedicated preprocessing snapshot. PostgreSQL owns immutable processing evidence, checkpoints, decisions, mappings and retries; it is not another task UI. Redis has no initial correctness role.

Jev's output is a typed judgment, not authority to write arbitrary state. The application enforces [classification policy](/architecture/classification-policy.md) and [manual edit preservation](/architecture/manual-edits.md).

The worker owns only its mapped tasks and dedicated snapshot. A label by itself is not proof of ownership. Existing plans, digests and Retro entries remain user/planner authored. See [artifact ownership](/architecture/planner-handoff.md#artifact-ownership).
