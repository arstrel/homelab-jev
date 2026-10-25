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
  at: 2026-10-25T20:32:10Z
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
    sha256: a5069d9ab2ebc61ee4aacdb855e90be35208537a22b8e5dd844d94a762f00d15
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
    sha256: f3fa753e6f571145da24462484639f6375d92db0c997e0c3561fd8360e1f6ce9
  - path: docs/retro-brief-evidence.md
    sha256: c4a537b431f04fdb62de90594b2f6a30d2fc11e000ed4af6ecfda0b68c0b57ce
---

# Retro interpretation and reusable inventory

Retro is user-authored feedback and read-only for the worker. It is not an email-task destination. Treat entries as evidence of what happened, rather than commands to close arbitrary tasks.

Separate finite obligations, broad goals and reusable activity options. A rowing session may support a specific completed-session candidate; it does not consume the general option to row tomorrow. Broad feedback such as "exercise went well" cannot close every Fitness & Health item.

Surface specific reconciliation candidates when task identity and completion evidence are credible. Preserve reusable inventory and uncertain cases. Never use yesterday's generated plan as proof of completion. Synchronize with current Todoist state and follow [manual edit rules](manual-edits.md).

See [project task kinds](/product/todoist-projects.md), [planner handoff](planner-handoff.md), and [uncertainty](uncertainty.md).

## Implemented manual review

The manual publisher reads recent open/completed Retro tasks and bounded comments, including recent comments on older scanned tasks. It resolves one current Retro project, reports provider-date basis and omitted/failed coverage, and displays source-linked escaped excerpts. Completed Retro entries never establish completion of other tasks.

Explicit --retro-review asks pinned Jev finite choices for task kind, one supplied task, relationship and an exact excerpt. Each required choice must meet provisional 0.85 confidence; the setting is uncalibrated. Ambiguous, conflicting, low-confidence and foreign-author evidence remains uncertain. Reusable activities, broad goals and source-recurring work stay available/open. Output is only a human-review suggestion: no task mutation, inferred date or generated action is accepted.

Review uses at most 50 displayed current task candidates and ten source records, within the same new-call cap and deadline as email triage. Full serialized requests are bounded to 32 KiB. Source context is refreshed on every publication; interpretations are ephemeral and explicit repeat review spends new calls. Context-only replay replaces them with not-requested state. Automatic reconciliation remains planned. Actual daily-consumer retrieval is separately accepted after the October 23 timer runs and October 25 canonical repair; this does not establish complete Retro coverage or useful matching quality. See the repository runbook docs/retro-brief.md and its source snapshots.

The approved live check reviewed ten feedback records against 43 current task titles in the same private Drive artifact. All ten remained uncertain below the provisional threshold; this establishes bounded transport/publication and conservative review, not matching accuracy. The source scan covered twelve tasks and comments on ten, omitting two records. A zero-inference context publication was verified before the final Retro-focused review, which deliberately omitted new email inference. See the sanitized evidence recorded in docs/retro-brief-evidence.md.
