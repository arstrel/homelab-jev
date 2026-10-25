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
  at: 2026-10-25T18:27:08Z
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
    sha256: 4e482cd3b344f06d4eb32aa5314be0efc091b0557f39b94e95a08e4e58afa3fd
  - path: src/adapters/jev-email-tasks.ts
    sha256: b95e50552261fb4665a4854d3758b32aa4760e10f73df01190f05bc6b19dc43e
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: src/domain/email-brief.ts
    sha256: 6d0919c76180ed5192a304028b75ad55f9a3fc1025d4c1b50be2c8a5a46da7b4
  - path: src/application/email-brief.ts
    sha256: 1b5ac51f57c8411e7bf5d48e2249ccf039214ffd856e99be1724d70e6cf98963
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/application/review-retro.ts
    sha256: 18a777d202fc3f64612316601ad6b77df0767796c5626e36851b94524bfa4976
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: src/adapters/postgres/email-brief.ts
    sha256: 480be952ed744105755a955e58e636d77d0269bb54d198f5a8a2b99764009e19
  - path: docs/automatic-mail-classification.md
    sha256: 0e645e05e062036b2469bcec859c12b2ba7b558b73afe012347a16b9682b19bc
  - path: src/cli-email-brief.ts
    sha256: 60851a6968994b4f983070dcab5c5a6d631b292344b5339323afdb6d6226254e
  - path: tests/unit/scheduled-email-brief.test.ts
    sha256: 2003a6d13f08af3ee07d194863a69435d1dd4d260c7cbf503608e2809188c5df
  - path: src/domain/automatic-capture.ts
    sha256: 2f9cc24b50d33ebc6492004129c583605b37766c8f5e2b7956f3fb1eb866082f
  - path: src/adapters/jev-capture.ts
    sha256: c24f33370498ddf03285d6bf32d90abcc790e20241cf6526db72453205608a0d
  - path: src/application/capture-mail.ts
    sha256: 182ee519a613a3e87adee05bdba8f86dca632348dd12b47679c1276dc2259573
  - path: docs/automatic-todoist-capture.md
    sha256: fcdfa9ddc123dc963b3968d753d9a0273f2060f289eb2c4eba3e681f776074ab
---

# Typed classification and evidence policy

Jev should classify action/FYI/noise, identify finite obligations, judge candidate matches and score bounded routing choices. Validate schemas and allow only discovered destination IDs. Exact dates require source evidence and deterministic validation. Code owns identity, confidence policy, arithmetic, task templates and write decisions.

Do not treat free-form model prose or email instructions as an executable plan. Supply only necessary evidence and context; keep credentials and unrelated private data out of requests. Source-based title templates and explicit review states limit unsupported invention.

The manual `mail:classify` preview implements separate kind, attention and lifecycle choices with explicit unknown values under `mail-triage/v1`, pinned to live-confirmed revision `jev-1.13.0`. It reads exact complete job evidence in a read-only transaction, sends minimized bounded state, validates responses and prints sanitized judgments. It leaves jobs and stored results unchanged. General candidate matching, corrections, calibrated thresholds and automatic task effects remain planned; parent 3.1 stays open.

The separate [reviewed task flow](/product/todoist-projects.md) uses v2 review policy: independent obligation eligibility plus bounded sentence/project choices. Criteria directly describe quoted source/project data to reduce indirection; those quotes are untrusted data, not authority. Only required eligibility can produce a proposal. Contextual review titles use the originating subject; apply recomputes supported titles and validates destination IDs. Inbox remains the routing fallback. Human approval supplies the capture decision; original triage jobs/results remain untouched. Candidate matching, corrections and automatic capture remain planned.

The initial model setting is uncalibrated. Evaluate a sanitized held-out set of representative messages, including ambiguous routing and matching, before broader rollout or claiming calibrated automatic capture. Low confidence and contradictory evidence route through [uncertainty](uncertainty.md). The triage runbook recorded in the source snapshots above describes privacy, bounds, replay charges and the model/evaluation boundary.

Explicit owner rules precede semantic judgment: ordinary GitHub PR notifications and Google Cloud terms-update notices are excluded before Jev and during apply. Sender/subject matching excludes neither security/CI notifications nor mixed direct correspondence. The fresh pilot's two proposals were rejected by the owner; source-supported wording alone does not establish personal usefulness. No task was created.

See [Jev adapter](/providers/jev-boundary.md), [evaluation](/operations/classification-evaluation.md), and [Gmail evidence](gmail-checkpoints.md).

The manual [Drive brief](planner-handoff.md) now saves successful typed triage and deterministic owner exclusions using exact evidence/direction/model/policy identity. Saving a judgment and completing its exact-bound job is atomic. Unchanged publication reuses saved decisions; invalid/provider failures do not complete jobs. Waiting has priority over attention; unknowns and resolution suggestions appear as review cases. This bounded email artifact does not complete parent classification/corrections/evaluation or authorize automatic capture.

The manual [Retro review](retro-feedback.md) now implements bounded finite task-kind and specific candidate/relation/excerpt choices under retro-review/v1. Unknown/contradictory/low-confidence choices remain uncertain. A provisional 0.85 threshold is uncalibrated and authorizes only source-linked review suggestions. Code preserves reusable/recurring work and broad goals; no task effects are connected. Full matching and calibrated automatic reconciliation remain planned.

The optional scheduled --classify-pending path processes up to ten due current jobs before cached publication, independently of display membership. Exact decisions and owner exclusions reuse the existing save contract; failures defer one hour. A persistent $2 lifetime allowance reserves maximum request cost before inference and retains ambiguous charges. It creates no tasks and does not calibrate automatic capture. Activation requires the merged runtime and migration. See docs/automatic-mail-classification.md.

Scheduled preprocessing now verifies managed storage readiness while holding publisher ownership before selecting jobs, reserving inference cost or saving decisions. Non-ready or unreadable storage prevents preprocessing; publication retains its independent readiness check. See src/cli-email-brief.ts and the scheduled composition regressions.

The opt-in capture pilot adds finite existing-task matching to source-supported eligibility/title/project selection. At most 100 open/recent-completed task titles enter a bounded request. Unknowns, contradictory choices, Inbox routing and confidence below 0.95 remain review-only. This provisional pilot cutoff is not calibrated accuracy or completion of the parent evaluation requirement. Code owns source-time admission, live inventory recheck, project IDs, the daily cap and all writes. See docs/automatic-todoist-capture.md.
