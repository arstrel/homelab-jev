---
type: Runbook
title: Native Node releases and scheduling
description: Deploy reviewed compiled releases with explicit migrations and bounded launchd cycles.
tags:
  - operations
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-11T02:21:58Z"
stale_after: "2026-11-10T02:21:58Z"
x_jev_delivery: planned
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/deploy/README.md
    title: deploy/README.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
x_jev_sources:
  - path: deploy/README.md
    sha256: 385020eedbb30c4c9d26925d362b0e9bc618880a0c6121bf9d4885d68e353d1b
  - path: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    sha256: cb573cbb85a6a53ad61363014df299c6f4eea8b6707a48b6aeb1d99b639e0408
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 1ae7c84b9957c1449c1f66a4e192f822883abcd15353e29e825987b06be1a479
---

# Native Node releases and scheduling

Use compiled Node 24 releases managed independently of the editable Git checkout. launchd will run one-shot cycles every five minutes with explicit paths and runtime configuration. Scheduling and immutable-release installation remain section 7 work; this repository does not yet install an active job.

Apply reviewed compatible migrations explicitly. Capture health, duration, last successful source synchronization and pending/retry counts with controlled logs. An advisory lock prevents overlapping workers; calls and overall execution have deadlines.

Rollback should select a compatible previous release while preserving ledger records and user tasks. Do not assume SQL reversal is safe. Rehearse the migration/release rollback procedure before production capture.

See [processing cycle](/architecture/processing-cycle.md), [migrations](database-migrations.md), and [delivery boundary](/product/delivery-boundary.md).
