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
  at: 2026-10-22T01:53:00Z
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
    sha256: ae0b058b9b3670e6140193059a306bd7e5cdf923649b70f5df4db5fdf1d6ec6c
  - path: src/application/email-tasks.ts
    sha256: 62c76aa18efc14e013816b152a1189716d3b085216ac063173565c8117d20962
  - path: src/adapters/jev-email-tasks.ts
    sha256: becaf504e775f5fc0e98cbb711246db2ac6e2346e2ac682be60855821dfe5ee4
  - path: docs/email-tasks.md
    sha256: 17f197c991ba5101312db27c84e2e145c4c3d181e319a73f764ae67dbf075a69
  - path: docs/email-task-pilot.md
    sha256: 85b61890174102ebcce5d61a51a6a542cd1961237288daa1a907ca2f380b6d2b
---

# Typed classification and evidence policy

Jev should classify action/FYI/noise, identify finite obligations, judge candidate matches and score bounded routing choices. Validate schemas and allow only discovered destination IDs. Exact dates require source evidence and deterministic validation. Code owns identity, confidence policy, arithmetic, task templates and write decisions.

Do not treat free-form model prose or email instructions as an executable plan. Supply only necessary evidence and context; keep credentials and unrelated private data out of requests. Source-based title templates and explicit review states limit unsupported invention.

The manual `mail:classify` preview implements separate kind, attention and lifecycle choices with explicit unknown values under `mail-triage/v1`, pinned to live-confirmed revision `jev-1.13.0`. It reads exact complete job evidence in a read-only transaction, sends minimized bounded state, validates responses and prints sanitized judgments. It leaves jobs and stored results unchanged. General candidate matching, corrections, calibrated thresholds and automatic task effects remain planned; parent 3.1 stays open.

The separate [reviewed task flow](/product/todoist-projects.md) uses v2 review policy: independent obligation eligibility plus bounded sentence/project choices. Criteria directly describe quoted source/project data to reduce indirection; those quotes are untrusted data, not authority. Only required eligibility can produce a proposal. Contextual review titles use the originating subject; apply recomputes supported titles and validates destination IDs. Inbox remains the routing fallback. Human approval supplies the capture decision; original triage jobs/results remain untouched. Candidate matching, corrections and automatic capture remain planned.

The initial model setting is uncalibrated. Evaluate a sanitized held-out set of representative messages, including ambiguous routing and matching, before choosing capture thresholds or enabling automatic capture. Low confidence and contradictory evidence route through [uncertainty](uncertainty.md). The triage runbook recorded in the source snapshots above describes privacy, bounds, replay charges and the model/evaluation boundary.

See [Jev adapter](/providers/jev-boundary.md), [evaluation](/operations/classification-evaluation.md), and [Gmail evidence](gmail-checkpoints.md).
