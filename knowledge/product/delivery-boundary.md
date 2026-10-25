---
type: Product
title: Implemented pipeline and remaining release
description: Separate deployed processing, live acceptance and the remaining reconciliation and quality work.
tags:
  - product
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/cli.ts
    title: src/cli.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/tasks.md
    title: openspec/changes/add-personal-brief-preprocessing/tasks.md
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/foundation-evidence.md
    title: docs/foundation-evidence.md
x_jev_sources:
  - path: src/cli.ts
    sha256: 600132fdfa3ab4a8132dba8a8f315dc0cca4a00bf8012c52e8050da34c440c8e
  - path: openspec/changes/add-personal-brief-preprocessing/tasks.md
    sha256: 4a3bdafa82ef98a23f097d0af1a3a5a14191c7f9ddc0250e38c18bd883ae1c74
  - path: docs/foundation-evidence.md
    sha256: 0631d15b29a84b3bd873d14a3e76f86be6081ba85281aaaef6e4173a4e9b6270
  - path: docs/mail-observation-evidence.md
    sha256: d615805f16343946e8ce577d78149780f5ac4b6fd77e2040c6af518b3a85ea71
  - path: docs/mail-triage.md
    sha256: 2a9a384419b55a6f6c1c71511759ea7e1ef960e2ef01cf57ca025155ca396057
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: deploy/README.md
    sha256: d9cff016d5cd902a8459361782f5bfd918cbc687fecccd2f82beb973a977eb95
  - path: docs/mail-worker-evidence.md
    sha256: 90d70e598cfa14dd1161fa7fd244ed1f24b74e21048ac8a3d05b66f2c9e0ab10
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: src/application/email-brief.ts
    sha256: 1b5ac51f57c8411e7bf5d48e2249ccf039214ffd856e99be1724d70e6cf98963
  - path: docs/email-brief-evidence.md
    sha256: bf7d371c90e3028e05719dd8f793e3522b48b5c0bb3d59f10f6b391a6abcce94
  - path: src/adapters/todoist-brief.ts
    sha256: 175e6f795d3f62cef8009803e1f974f1bc96655624ce85f0eabf0dba90d45be7
  - path: src/domain/todoist-brief.ts
    sha256: 97e80af779dba85133ded6ac4e92c5b7095da7b32297f6bb1997561e6b660e5e
  - path: docs/todoist-brief-evidence.md
    sha256: a5a4c60b65336f51012956db6fa2ec942a1b8467fedd042a4235dd9ee06b643f
  - path: src/application/capture-mail.ts
    sha256: 1ad2014e481f2692dd9ad7c4c045f92b8074d3f150d9f2ed41b0f0b7694cceff
  - path: docs/automatic-capture-evidence.md
    sha256: 1bcd2644ec0a175fc173ab9c3fd52d1108de68ff9ab14a50e7de4913abb00c78
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# Implemented pipeline and remaining release

The current delivery account is the repository's `docs/product-requirements.md` progress table and parent OpenSpec checklist. Completed slice changes establish only their stated scope; broader acceptance remains open where noted.

- Foundation: pinned Node/TypeScript, Drizzle/pg, independent provider grants, deterministic Git gates, isolated PostgreSQL and required CI are implemented.
- [Collection](/architecture/mail-sync.md): native five-minute polling, exact immutable evidence/jobs, paced reads and bounded expired-cursor recovery are implemented. October 25 repair and a subsequent strict zero-work timer pair closed scoped catch-up/no-change acceptance. Live expired-cursor recovery remains synthetic-only.
- [Classification](/architecture/classification-policy.md): typed judgments, saved exact decisions, owner exclusions and bounded pending classification are active under a durable $2 lifetime allowance. Display sampling is separate from queue processing and source freshness.
- [Todoist capture](todoist-projects.md): the create-only pilot is enabled with source-time admission, mapping/reference/bounded semantic matching, a rolling three-intent cap and preservation of existing remote fields. Its timer/publication wiring is verified; useful real task creation/matching is not yet accepted.
- [Retro](/architecture/retro-feedback.md): bounded source context and optional manual typed review are implemented. Live suggestions stayed uncertain; no human-reviewed task-kind inventory or calibrated reconciliation quality is claimed.
- [Daily handoff](/architecture/planner-handoff.md): stable private Drive publication and both actual October 23 daily consumers are verified; approved October 25 JSON repair/readback closed the isolated handoff slice. A specific block-fit/optional-inventory acceptance example remains open in the broader parent checklist.
- [Native releases](/operations/native-releases.md): collector and publisher run separately from the editable checkout. Source gaps, retention limits and rollback preparation remain explicit.

Still open: representative held-out evaluation and corrections; durable review resolution; ambiguous-write reconciliation; multiple obligations per thread; waiting/lifecycle updates; full rollback/interruption acceptance and the final release report. The narrow owner-approved capture pilot does not satisfy the original pre-capture evaluation requirement.

Gmail mark-as-read automation is not implemented under the worker's read-only grant. Gmail labels, inferred automatic completion, Calendar writes and historical inbox cleanup remain later work. `status` counts stored ledger rows, not complete provider coverage. No general `cycle` command is implemented.

Use dated repository evidence rather than old counts as current health. The original October 18–22 incomplete observations remain historical; the October 25 acceptance supersedes only the gaps it actually demonstrates. Follow [development gates](/operations/development-gates.md) and [knowledge maintenance](/operations/okf-maintenance.md).
