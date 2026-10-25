---
type: Workflow
title: Classification quality and rollout evidence
description: Keep representative quality evaluation open while distinguishing active pilot policy and accepted deployment.
tags:
  - operations
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/tasks.md
    title: openspec/changes/add-personal-brief-preprocessing/tasks.md
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: a5069d9ab2ebc61ee4aacdb855e90be35208537a22b8e5dd844d94a762f00d15
  - path: openspec/changes/add-personal-brief-preprocessing/tasks.md
    sha256: 4a3bdafa82ef98a23f097d0af1a3a5a14191c7f9ddc0250e38c18bd883ae1c74
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
---

# Classification quality and rollout evidence

Typed classification and bounded automatic capture are implemented and active; representative quality evaluation remains unfinished. The pinned `jev-1.13.0` model and provisional 0.95 capture cutoff are pilot policy, not calibrated results. The owner-approved create-only pilot is a narrow rollout exception; it does not satisfy the original requirement to evaluate representative corrected examples before general automatic capture.

Build a sanitized representative set, initially about 100–200 examples with a held-out portion. Include action/FYI/noise, multiple obligations, sent replies, repeated versions, ambiguous matches, uncertain dates and routing. Measure missed actions, incorrect captures, routing errors, review load, latency and cost. Correction recording and durable review resolution remain open.

Synthetic policy/transport/database checks establish bounded choices, identity, replay and failure behavior. The Retro development examples were used for tuning and are not held out; live Retro task-kind results remain unverified. A successful connection, schema-valid answer, publication or zero-work timer is not useful-capture accuracy evidence.

Collection catch-up/no-change acceptance is recorded separately in repository `docs/mail-observation-evidence.md`. Recurring classification and create-only capture activation are recorded in `docs/automatic-capture-evidence.md`; no useful post-boundary capture is accepted there. Actual scheduled snapshot retrieval is accepted in `docs/scheduled-brief-evidence.md`, after the canonical JSON repair. These delivered steps must not be described as still planned, or substituted for the unfinished quality/lifecycle criteria.

OKF token/search savings remain a separate hypothesis, not a claimed benchmark. See [classification policy](/architecture/classification-policy.md), [uncertainty](/architecture/uncertainty.md), [delivery status](/product/delivery-boundary.md) and [OKF maintenance](okf-maintenance.md).
