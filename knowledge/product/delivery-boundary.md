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
  at: 2026-10-22T01:53:00Z
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
    sha256: f04858560cf99f3fbee4a4fcd8e5fc73bf8e4d7d93cd2d54f5be66bc2a9c416a
  - path: openspec/changes/add-personal-brief-preprocessing/tasks.md
    sha256: 306bfcf09d7a0e01b3cee6969a4606a6045ba4fc89f504d658bc2c75bd7f3a2e
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
---

# Implemented foundation and planned release

Section 1 is complete: pinned Node/TypeScript tooling, configuration validation, bounded provider checks, structured logging, Drizzle/pg ledger schema and repositories, migrations, deterministic Git gates, PostgreSQL regression tests and required CI. The CLI can report ledger status and perform explicit connection/database commands. Google authorization tooling supports repeat grants.

The isolated [Gmail evidence slice](/architecture/gmail-evidence.md) implements parent task 2.1 and pure fingerprints: bounded manual retrieval, normalized conversation text and private coverage reporting. Its live sample includes explicit partial bodies. Manual [durable ingestion](/architecture/mail-ingestion.md) preserves complete evidence versions and exact-bound pending jobs. Consult the observation report for operational results. Manual [incremental sync](/architecture/mail-sync.md) resumes bootstrap/history and durable retries with separate evidence freshness. [Bounded expired-cursor recovery](/architecture/mail-recovery.md) implements parent task 2.3, retaining mapped coverage and an explicit history gap. Remaining release behavior includes complete collection acceptance, persisted/evaluated classification, Todoist reconciliation, Retro interpretation, Drive handoff and launchd deployment. `status` counts ledger rows; it does not prove provider freshness. `cycle` is not a working scheduler or processing loop.

The initial release includes obligation capture and routing. Inferred resolution remains a review suggestion. Gmail label writes, automatic completion from model inference, Calendar writes and whole-inbox cleanup require later changes.

DB-only [mail diagnostics](/operations/mail-observation.md) and a bounded manual pilot procedure are implemented. Parent task 2.4 still needs actual catch-up/no-change evidence; a diagnostics/tooling merge cannot establish that result or complete the scheduled rollout pilot. Consult the current evidence report before making a live-operation claim.

Follow [development gates](/operations/development-gates.md) and [release operations](/operations/native-releases.md). Consult the current OpenSpec checklist before changing this summary.

The [reviewed email task flow](/product/todoist-projects.md) now samples up to ten stored conversations and creates only explicitly approved source-sentence/project proposals. It reuses existing intents/links for duplicate and uncertain-response protection. This manual slice does not complete parent Sections 3/4: matching, automatic capture, evaluation, full reconciliation and live capture evidence remain pending.

The authorized manual collection report now records applied migrations, discovery catch-up and 516 complete versions/jobs, with 409 retrievals still pending after the latest paced session reached its 20-run cap. Its 400 retrieval attempts reported no new provider error or throttling; partial coverage and older queued failures remain. Evidence freshness is still null. Parent 2.4 remains incomplete. A read-only [Jev triage preview](/architecture/classification-policy.md) implements kind/attention/lifecycle judgments on exact complete evidence; general matching, automatic routing, persistence/corrections, calibrated capture and scheduled rollout remain planned. Neither preview command creates tasks or consumes jobs.

On October 21 (Pacific), the approved fresh pilot read ten complete recent conversations and added ten exact-bound jobs, bringing the diagnostic count to 526. The improved preview returned two review proposals and eight no-clear-action results without task creation or intent changes. The 409 retrieval backlog and null evidence freshness remain. This is bounded pilot evidence; usefulness still needs human confirmation, and full catch-up, capture validation and deployment stay open.

The owner rejected both proposals and supplied no-task preferences for routine GitHub PR mail and Google Cloud terms updates; the fix enforces these exclusions. A separately authorized connected-Gmail cleanup marked 37 routine PR messages read and left two CI failures unread. Continuous worker read-state changes are not implemented under the current read-only grant. No useful live Todoist capture has been accepted yet.
