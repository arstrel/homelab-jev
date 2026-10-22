---
type: Workflow
title: Five-minute processing cycle
description: A bounded native poller moves evidence through durable stages and
  publishes truthful context.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T16:14:17.896Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 57608a033d0e0b7e39ae997a387239b8b34ae35720ffcf68f2039cdb06fec00d
  - path: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    sha256: cb573cbb85a6a53ad61363014df299c6f4eea8b6707a48b6aeb1d99b639e0408
  - path: deploy/README.md
    sha256: d9cff016d5cd902a8459361782f5bfd918cbc687fecccd2f82beb973a977eb95
  - path: scripts/mail-worker.ts
    sha256: 87ff1739e86a7a02fa241e6a4b5253e0547d9ad39a5513c24314454ece280a4c
---

# Five-minute processing cycle

The approved runtime is a native Node one-shot job launched every five minutes by launchd on the Mac mini. No live Gmail push webhook is needed. [Deployment tooling](/operations/native-releases.md) implements the collection-only launcher; the complete processing cycle below remains planned. Activation and recurring acceptance require their own evidence.

A cycle acquires a dedicated PostgreSQL advisory lock, discovers Gmail changes, durably records source versions and jobs, classifies pending work, reconciles Todoist, interprets relevant Retro evidence, and publishes the Drive snapshot. An overlapping run skips safely. Never return a connection holding the lock to a shared pool.

Provider failures must preserve pending work and report real freshness gaps. Bound calls, retries and total run time; graceful termination releases the lock and retains retryable state.

Follow [Gmail checkpoints](gmail-checkpoints.md), [remote write safety](remote-write-safety.md), [planner handoff](planner-handoff.md), and [native releases](/operations/native-releases.md).

Manual [incremental synchronization](mail-sync.md) implements collection with exclusive session ownership and durable retries. The optional launcher reuses that command and lock rather than introducing another processing loop. A separate five-minute cached-only publisher refreshes the owned Drive brief and current Todoist/Retro context with zero hosted inference. Persistent classification, reconciliation and full live rollout remain planned.
