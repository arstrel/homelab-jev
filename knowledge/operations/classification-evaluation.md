---
type: Workflow
title: Classification quality and rollout evidence
description: Select model and thresholds from representative evidence before
  automatic task capture.
tags:
  - operations
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-18T06:26:11.007Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: planned
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
    sha256: aa3618c539140b7993e86e1740221eae20af1824514f0ae78b1b6fb1e48e0a2d
  - path: openspec/changes/add-personal-brief-preprocessing/tasks.md
    sha256: e52dbdd0d935777af8462c90bd7563a985a2711328f872100387c8f54b9b0ae4
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
---

# Classification quality and rollout evidence

Build a sanitized representative held-out set, initially about 100–200 examples as a planning target. Include action/FYI/noise, multi-obligation threads, sent replies, repeated versions, ambiguous matches, uncertain dates and project choices. Measure routing/matching errors and review load, not just schema-valid output.

Choose model version and thresholds using these results; none are approved yet. Observation mode should expose proposed classifications, task matches and writes before enabling automatic capture. Retain source-linked evidence and correction reasons without committing private mail.

Demonstrate replay, manual overrides, suppression, ambiguity reconciliation and actual scheduled-planner snapshot retrieval. A passing connection check or unit suite does not establish this release quality. The implemented manual [Gmail preview](/architecture/gmail-evidence.md) verifies retrieval coverage only: it does not call Jev or replace the planned classification observation/evaluation pilot.

[Durable ingestion](/architecture/mail-ingestion.md) now supplies reproducible complete evidence versions to pending jobs. Its initial queue policy string is not an evaluated classifier/model choice, and no Jev calls or automatic capture occur.

OKF token/search savings are a separate pilot hypothesis, not a claimed benchmark for Jev. See [classification policy](/architecture/classification-policy.md), [uncertainty](/architecture/uncertainty.md), and [OKF maintenance](okf-maintenance.md).
