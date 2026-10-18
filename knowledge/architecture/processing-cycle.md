---
type: Workflow
title: Five-minute processing cycle
description: A bounded native poller moves evidence through durable stages and
  publishes truthful context.
tags:
  - architecture
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 4357f906b1b56ce9bf01dcbba3c8bc4999e497a3002022c51ac7bdf68d8d8b95
  - path: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    sha256: cb573cbb85a6a53ad61363014df299c6f4eea8b6707a48b6aeb1d99b639e0408
---

# Five-minute processing cycle

The approved runtime is a native Node one-shot job launched every five minutes by launchd on the Mac mini. No live Gmail push webhook is needed. The launcher and cycle are not implemented yet.

A cycle acquires a dedicated PostgreSQL advisory lock, discovers Gmail changes, durably records source versions and jobs, classifies pending work, reconciles Todoist, interprets relevant Retro evidence, and publishes the Drive snapshot. An overlapping run skips safely. Never return a connection holding the lock to a shared pool.

Provider failures must preserve pending work and report real freshness gaps. Bound calls, retries and total run time; graceful termination releases the lock and retains retryable state.

Follow [Gmail checkpoints](gmail-checkpoints.md), [remote write safety](remote-write-safety.md), [planner handoff](planner-handoff.md), and [native releases](/operations/native-releases.md).

Manual [incremental synchronization](mail-sync.md) now implements the collection portion with exclusive session ownership and durable retries. The five-minute launcher, classification/reconciliation/publication cycle and live operation remain planned.
