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
  at: 2026-10-18T23:36:37.354Z
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
    sha256: 3e37ed5a952c167b8428497a4dd8a296c3b7b7db02eb69bdc301e380674f5e80
  - path: openspec/changes/add-personal-brief-preprocessing/tasks.md
    sha256: 737c69077c312a210ff583255345680d34ef2b0fdd3a4ee6fd208103494d3815
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
---

# Classification quality and rollout evidence

Build a sanitized representative held-out set, initially about 100–200 examples as a planning target. Include action/FYI/noise, multi-obligation threads, sent replies, repeated versions, ambiguous matches, uncertain dates and project choices. Measure routing/matching errors and review load, not just schema-valid output.

Choose model version and thresholds using these results; none are approved yet. Observation mode should expose proposed classifications, task matches and writes before enabling automatic capture. Retain source-linked evidence and correction reasons without committing private mail.

Demonstrate replay, manual overrides, suppression, ambiguity reconciliation and actual scheduled-planner snapshot retrieval. A passing connection check or unit suite does not establish this release quality. The implemented manual [Gmail preview](/architecture/gmail-evidence.md) verifies retrieval coverage only: it does not call Jev or replace the planned classification observation/evaluation pilot.

[Durable ingestion](/architecture/mail-ingestion.md) now supplies reproducible complete evidence versions to pending jobs. Its initial queue policy string is not an evaluated classifier/model choice, and no Jev calls or automatic capture occur.

OKF token/search savings are a separate pilot hypothesis, not a claimed benchmark for Jev. See [classification policy](/architecture/classification-policy.md), [uncertainty](/architecture/uncertainty.md), and [OKF maintenance](okf-maintenance.md).

Manual incremental collection now provides an evidence-completion timestamp separate from discovery progress. Neither timestamp establishes classification or task freshness. The no-change/retry suites remain synthetic collection evidence, not a Jev quality evaluation.
