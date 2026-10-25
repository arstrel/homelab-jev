---
type: Product
title: Implemented foundation and planned release
description: Avoid describing approved plans as deployed processing behavior.
tags:
  - product
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T19:30:09Z
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
    sha256: 1bb5251caaa35c7fb47b169e260f8a191c06dab5fe97ab0e34b688c3203b9c55
  - path: docs/foundation-evidence.md
    sha256: 0631d15b29a84b3bd873d14a3e76f86be6081ba85281aaaef6e4173a4e9b6270
  - path: docs/mail-observation-evidence.md
    sha256: b804e0269de1e48d9c5a910face20c9c604bf6c674f5d250143ffd7aab24e167
  - path: docs/mail-triage.md
    sha256: 2a9a384419b55a6f6c1c71511759ea7e1ef960e2ef01cf57ca025155ca396057
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: deploy/README.md
    sha256: d9cff016d5cd902a8459361782f5bfd918cbc687fecccd2f82beb973a977eb95
  - path: docs/mail-worker-evidence.md
    sha256: e7c1c9a9dcb0b8d7bc10c289ac6a28960a5255b113343279c620b70943cb76ca
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
    sha256: 37b80c3e58e80baa801d2856a746e614e971700e537092fa05bd15f9fdc7ce7b
  - path: docs/automatic-capture-evidence.md
    sha256: 9087226c6d39f2948e756021225c5c373ae09f3ad59f510e6fc9b87066240a3f
  - path: docs/automatic-todoist-capture.md
    sha256: 8d54de7da56aef47f136f8eb9bc43331a691d155cd1b5f2e404d36bc944de0a3
---

# Implemented foundation and planned release

Section 1 is complete: pinned Node/TypeScript tooling, configuration validation, bounded provider checks, structured logging, Drizzle/pg ledger schema and repositories, migrations, deterministic Git gates, PostgreSQL regression tests and required CI. The CLI can report ledger status and perform explicit connection/database commands. Google authorization tooling supports repeat grants.

The isolated [Gmail evidence slice](/architecture/gmail-evidence.md) implements parent task 2.1 and pure fingerprints: bounded manual retrieval, normalized conversation text and private coverage reporting. Its live sample includes explicit partial bodies. Manual [durable ingestion](/architecture/mail-ingestion.md) preserves complete evidence versions and exact-bound pending jobs. Consult the observation report for operational results. Manual [incremental sync](/architecture/mail-sync.md) resumes bootstrap/history and durable retries with separate evidence freshness. [Bounded expired-cursor recovery](/architecture/mail-recovery.md) implements parent task 2.3, retaining mapped coverage and an explicit history gap. Remaining release behavior includes complete collection acceptance, evaluated classification, Todoist reconciliation, full Retro reconciliation and full planner handoff. `status` counts ledger rows; it does not prove provider freshness. `cycle` is not a working scheduler or processing loop.

The initial release includes obligation capture and routing. Inferred resolution remains a review suggestion. Gmail label writes, automatic completion from model inference, Calendar writes and whole-inbox cleanup require later changes.

DB-only [mail diagnostics](/operations/mail-observation.md) and a bounded manual pilot procedure are implemented. Parent task 2.4 still needs actual catch-up/no-change evidence; a diagnostics/tooling merge cannot establish that result or complete the scheduled rollout pilot. Consult the current evidence report before making a live-operation claim.

Follow [development gates](/operations/development-gates.md) and [release operations](/operations/native-releases.md). Consult the current OpenSpec checklist before changing this summary.

The [reviewed email task flow](/product/todoist-projects.md) now samples up to ten stored conversations and creates only explicitly approved source-sentence/project proposals. It reuses existing intents/links for duplicate and uncertain-response protection. This manual slice does not complete parent Sections 3/4: matching, automatic capture, evaluation, full reconciliation and live capture evidence remain pending.

The authorized manual collection report now records applied migrations, discovery catch-up and 516 complete versions/jobs, with 409 retrievals still pending after the latest paced session reached its 20-run cap. Its 400 retrieval attempts reported no new provider error or throttling; partial coverage and older queued failures remain. Evidence freshness is still null. Parent 2.4 remains incomplete. A read-only [Jev triage preview](/architecture/classification-policy.md) implements kind/attention/lifecycle judgments on exact complete evidence; general matching, automatic routing, corrections, calibrated capture and scheduled rollout remain planned. Neither preview command creates tasks or consumes jobs.

On October 21 (Pacific), the approved fresh pilot read ten complete recent conversations and added ten exact-bound jobs, bringing the diagnostic count to 526. The improved preview returned two review proposals and eight no-clear-action results without task creation or intent changes. The 409 retrieval backlog and null evidence freshness remain. This is bounded pilot evidence; usefulness still needs human confirmation, and full catch-up, capture validation and deployment stay open.

The owner rejected both proposals and supplied no-task preferences for routine GitHub PR mail and Google Cloud terms updates; the fix enforces these exclusions. A separately authorized connected-Gmail cleanup marked 37 routine PR messages read and left two CI failures unread. Continuous worker read-state changes are not implemented under the current read-only grant. No useful live Todoist capture has been accepted yet.

The [collector installer](/operations/native-releases.md) now packages reviewed compiled releases and controls a collection-only five-minute launchd job. The merged collector was activated on October 21 Pacific; two automatic invocations and an overlapping manual skip were observed. The repository report `docs/mail-worker-evidence.md` records the timestamped activation, preserved backlog and null evidence freshness. Full processing-cycle and catch-up acceptance remain open. Parent deployment and rollout milestones remain open until their broader verification succeeds.

The manual [Drive brief](/architecture/planner-handoff.md) initially delivered the first downstream email artifact: saved/reused typed triage, owner exclusions and one private source-linked Markdown file with honest sample/freshness/gap metadata. No tasks, Gmail changes or scheduled prompt edits follow. Full reconciliation/planner handoff, automatic capture, calibration and scheduled inference remain unfinished.

The manual brief now includes current read-only Todoist context by project, existing due values and exact source-link already-tracked annotations. Read/page/display gaps remain visible and Todoist stays authoritative. Full semantic reconciliation, automatic capture and scheduled planner consumption remain unfinished; bounded Retro context/review is described below. This partial task-read slice does not complete the full parent reconciliation or handoff milestones.

The manual brief now includes recent Retro task/comment context and optional typed review, sharing its existing artifact and inference allowance. Completed feedback is read, not interpreted as automatic task closure. This narrows the remaining Retro work to full reconciliation, calibrated evaluation and actual scheduled planner use; it does not complete those parent requirements.

The separate cached-only publisher now refreshes the owned Drive artifact every five minutes with zero Jev calls, and both existing daily prompts have an additive freshness/fallback handoff. This does not enable automatic classification or reconciliation. October 23 daily runs verified exact generation retrieval, live-source authority and saved canonical artifacts. The owner-approved October 25 digest JSON repair and full readback close the isolated handoff slice; broader rollout requirements remain open. See [planner handoff](/architecture/planner-handoff.md).

October 25 update: merged PR #23 is active for both native jobs after backup/migration. A real recurring classification/publication and independent owned-file readback passed, with zero current retrieval gaps at observation and explicit incomplete classification/Retro coverage. The opt-in create-only Todoist capture pilot is implemented and active after the reviewed PR #25 merge, with exact-reference/bounded semantic matching and preserved user fields/mapped completion. A real timer/owned-file readback passed with no post-boundary sources; useful live capture, calibrated evaluation, waiting/lifecycle updates and general reconciliation remain open. See docs/automatic-capture-evidence.md.
