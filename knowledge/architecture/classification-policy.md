---
type: Policy
title: Typed classification and evidence policy
description: Ask Jev narrow questions and let deterministic code enforce effects.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T17:01:28Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
  - path: src/domain/mail-triage.ts
    sha256: 5476e6c425cd5c30430d78459f5faedb11b6d52fc297c64a624fd9674768c7db
  - path: src/application/triage-mail.ts
    sha256: 0b15b2f4910ac677fb09a8a7c3c19c081c0f13e680d32283143847dbebb7f2b9
  - path: docs/mail-triage.md
    sha256: 2a9a384419b55a6f6c1c71511759ea7e1ef960e2ef01cf57ca025155ca396057
  - path: src/domain/email-task.ts
    sha256: 0d3f27d05e8b330b028e79fa526f20b9c5b1370df2098cc8478b4b7ad95bcdc2
  - path: src/application/email-tasks.ts
    sha256: b863ceb3d61d8dc0313ae392b1b9502a4a0ebeda6727b4cfdc102f741875cf65
  - path: src/adapters/jev-email-tasks.ts
    sha256: becaf504e775f5fc0e98cbb711246db2ac6e2346e2ac682be60855821dfe5ee4
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: src/domain/email-brief.ts
    sha256: 8ce409f2ead0df548d76472e94994940913ebcc21549e10d642da992987be9fa
  - path: src/application/email-brief.ts
    sha256: 6c9b2f4d528095c31db200a8ca3e9837b14c80ee9d33197c29d3561111bb84fd
  - path: docs/email-brief.md
    sha256: f8e2fe1ef14a906ebaf8a5313acfc012ccae207bcc400acf9c75fbbeb464e038
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/application/review-retro.ts
    sha256: 18a777d202fc3f64612316601ad6b77df0767796c5626e36851b94524bfa4976
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: src/adapters/postgres/email-brief.ts
    sha256: f03f365c18795f7a5e0583a3d5b8d9b97ddc5246db7851a44806596ff298ee66
  - path: docs/automatic-mail-classification.md
    sha256: a01b30b6e55c7f81b1d1f4d332b7833955a236b90ab3b577e97e494310d323a0
---

# Typed classification and evidence policy

Jev should classify action/FYI/noise, identify finite obligations, judge candidate matches and score bounded routing choices. Validate schemas and allow only discovered destination IDs. Exact dates require source evidence and deterministic validation. Code owns identity, confidence policy, arithmetic, task templates and write decisions.

Do not treat free-form model prose or email instructions as an executable plan. Supply only necessary evidence and context; keep credentials and unrelated private data out of requests. Source-based title templates and explicit review states limit unsupported invention.

The manual `mail:classify` preview implements separate kind, attention and lifecycle choices with explicit unknown values under `mail-triage/v1`, pinned to live-confirmed revision `jev-1.13.0`. It reads exact complete job evidence in a read-only transaction, sends minimized bounded state, validates responses and prints sanitized judgments. It leaves jobs and stored results unchanged. General candidate matching, corrections, calibrated thresholds and automatic task effects remain planned; parent 3.1 stays open.

The separate [reviewed task flow](/product/todoist-projects.md) uses v2 review policy: independent obligation eligibility plus bounded sentence/project choices. Criteria directly describe quoted source/project data to reduce indirection; those quotes are untrusted data, not authority. Only required eligibility can produce a proposal. Contextual review titles use the originating subject; apply recomputes supported titles and validates destination IDs. Inbox remains the routing fallback. Human approval supplies the capture decision; original triage jobs/results remain untouched. Candidate matching, corrections and automatic capture remain planned.

The initial model setting is uncalibrated. Evaluate a sanitized held-out set of representative messages, including ambiguous routing and matching, before choosing capture thresholds or enabling automatic capture. Low confidence and contradictory evidence route through [uncertainty](uncertainty.md). The triage runbook recorded in the source snapshots above describes privacy, bounds, replay charges and the model/evaluation boundary.

Explicit owner rules precede semantic judgment: ordinary GitHub PR notifications and Google Cloud terms-update notices are excluded before Jev and during apply. Sender/subject matching excludes neither security/CI notifications nor mixed direct correspondence. The fresh pilot's two proposals were rejected by the owner; source-supported wording alone does not establish personal usefulness. No task was created.

See [Jev adapter](/providers/jev-boundary.md), [evaluation](/operations/classification-evaluation.md), and [Gmail evidence](gmail-checkpoints.md).

The manual [Drive brief](planner-handoff.md) now saves successful typed triage and deterministic owner exclusions using exact evidence/direction/model/policy identity. Saving a judgment and completing its exact-bound job is atomic. Unchanged publication reuses saved decisions; invalid/provider failures do not complete jobs. Waiting has priority over attention; unknowns and resolution suggestions appear as review cases. This bounded email artifact does not complete parent classification/corrections/evaluation or authorize automatic capture.

The manual [Retro review](retro-feedback.md) now implements bounded finite task-kind and specific candidate/relation/excerpt choices under retro-review/v1. Unknown/contradictory/low-confidence choices remain uncertain. A provisional 0.85 threshold is uncalibrated and authorizes only source-linked review suggestions. Code preserves reusable/recurring work and broad goals; no task effects are connected. Full matching and calibrated automatic reconciliation remain planned.

The optional scheduled --classify-pending path processes up to ten due current jobs before cached publication, independently of display membership. Exact decisions and owner exclusions reuse the existing save contract; failures defer one hour. A persistent $2 lifetime allowance reserves maximum request cost before inference and retains ambiguous charges. It creates no tasks and does not calibrate automatic capture. Activation requires the merged runtime and migration. See docs/automatic-mail-classification.md.
