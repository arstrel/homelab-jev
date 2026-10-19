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
  at: 2026-10-19T03:33:58.002192Z
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
---

# Typed classification and evidence policy

Jev should classify action/FYI/noise, identify finite obligations, judge candidate matches and score bounded routing choices. Validate schemas and allow only discovered destination IDs. Exact dates require source evidence and deterministic validation. Code owns identity, confidence policy, arithmetic, task templates and write decisions.

Do not treat free-form model prose or email instructions as an executable plan. Supply only necessary evidence and context; keep credentials and unrelated private data out of requests. Source-based title templates and explicit review states limit unsupported invention.

The manual `mail:classify` preview implements separate kind, attention and lifecycle choices with explicit unknown values under `mail-triage/v1`, pinned to live-confirmed revision `jev-1.13.0`. It reads exact complete job evidence in a read-only transaction, sends minimized bounded state, validates responses and prints sanitized judgments. It leaves jobs and stored results unchanged. Candidate matching, routing, corrections, capture thresholds and task effects remain planned; parent 3.1 stays open.

The initial model setting is uncalibrated. Evaluate a sanitized held-out set of representative messages, including ambiguous routing and matching, before choosing capture thresholds or enabling automatic capture. Low confidence and contradictory evidence route through [uncertainty](uncertainty.md). The triage runbook recorded in the source snapshots above describes privacy, bounds, replay charges and the model/evaluation boundary.

See [Jev adapter](/providers/jev-boundary.md), [evaluation](/operations/classification-evaluation.md), and [Gmail evidence](gmail-checkpoints.md).
