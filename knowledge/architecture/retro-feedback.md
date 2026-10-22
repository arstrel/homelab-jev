---
type: Policy
title: Retro interpretation and reusable inventory
description: Use daily feedback without consuming broad goals or recurring activity options.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T13:58:41.678Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
  - path: openspec/changes/add-personal-brief-preprocessing/specs/retro-feedback/spec.md
    sha256: 6dbc33bf41d370c7822aac9b680dbeb82120944abeb56dbc6cfe898c41e15e51
  - path: src/domain/retro.ts
    sha256: 997972e7083e2471c3aff62444a36badf295934d30d7ee556b9cf917e68f7bbb
  - path: src/adapters/todoist-retro.ts
    sha256: e4f8df66104ea1740daa923cf4ca61bc607df35a3de6792518eb5a065a3d1cbe
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/application/review-retro.ts
    sha256: 18a777d202fc3f64612316601ad6b77df0767796c5626e36851b94524bfa4976
  - path: docs/retro-brief.md
    sha256: a4c8f75490b5390265db0e922edd6834e401b1c9654a7c1ec1246d8fd81c96bd
---

# Retro interpretation and reusable inventory

Retro is user-authored feedback and read-only for the worker. It is not an email-task destination. Treat entries as evidence of what happened, rather than commands to close arbitrary tasks.

Separate finite obligations, broad goals and reusable activity options. A rowing session may support a specific completed-session candidate; it does not consume the general option to row tomorrow. Broad feedback such as "exercise went well" cannot close every Fitness & Health item.

Surface specific reconciliation candidates when task identity and completion evidence are credible. Preserve reusable inventory and uncertain cases. Never use yesterday's generated plan as proof of completion. Synchronize with current Todoist state and follow [manual edit rules](manual-edits.md).

See [project task kinds](/product/todoist-projects.md), [planner handoff](planner-handoff.md), and [uncertainty](uncertainty.md).

## Implemented manual review

The manual publisher reads recent open/completed Retro tasks and bounded comments, including recent comments on older scanned tasks. It resolves one current Retro project, reports provider-date basis and omitted/failed coverage, and displays source-linked escaped excerpts. Completed Retro entries never establish completion of other tasks.

Explicit --retro-review asks pinned Jev finite choices for task kind, one supplied task, relationship and an exact excerpt. Each required choice must meet provisional 0.85 confidence; the setting is uncalibrated. Ambiguous, conflicting, low-confidence and foreign-author evidence remains uncertain. Reusable activities, broad goals and source-recurring work stay available/open. Output is only a human-review suggestion: no task mutation, inferred date or generated action is accepted.

Review uses at most 50 displayed current task candidates and ten source records, within the same new-call cap and deadline as email triage. Full serialized requests are bounded to 32 KiB. Source context is refreshed on every publication; interpretations are ephemeral and explicit repeat review spends new calls. Context-only replay replaces them with not-requested state. Automatic reconciliation and scheduled planner acceptance remain planned. See the repository runbook docs/retro-brief.md and its source snapshots.
