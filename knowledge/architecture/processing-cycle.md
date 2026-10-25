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
  at: 2026-10-25T18:27:08Z
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
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: deploy/brief-refresh.md
    sha256: 11683cc53fce5817189291ddc34e7d0c4e03f0c09d56f68ead4f5bf07486a46e
  - path: src/cli-email-brief.ts
    sha256: ebfa4658d425f12aeaeef605cadc7b08e4cd6712bff06ddcd654c2c6128ec38d
  - path: src/application/capture-mail.ts
    sha256: 37b80c3e58e80baa801d2856a746e614e971700e537092fa05bd15f9fdc7ce7b
  - path: docs/automatic-capture-evidence.md
    sha256: 17c810b586d5b1769b6864d879f2185bb5ce2aa1db12f6712a3fc310cd69be3e
  - path: docs/automatic-todoist-capture.md
    sha256: 01545f82255a2befa87b4ee4c86302485f4f92c7c720ce33578e56865cfef2dd
---

# Five-minute processing cycle

The approved runtime is a native Node one-shot job launched every five minutes by launchd on the Mac mini. No live Gmail push webhook is needed. [Deployment tooling](/operations/native-releases.md) implements the collection-only launcher; the complete processing cycle below remains planned. Activation and recurring acceptance require their own evidence.

A cycle acquires a dedicated PostgreSQL advisory lock, discovers Gmail changes, durably records source versions and jobs, classifies pending work, reconciles Todoist, interprets relevant Retro evidence, and publishes the Drive snapshot. An overlapping run skips safely. Never return a connection holding the lock to a shared pool.

Provider failures must preserve pending work and report real freshness gaps. Bound calls, retries and total run time; graceful termination releases the lock and retains retryable state.

Follow [Gmail checkpoints](gmail-checkpoints.md), [remote write safety](remote-write-safety.md), [planner handoff](planner-handoff.md), and [native releases](/operations/native-releases.md).

Manual [incremental synchronization](mail-sync.md) implements collection with exclusive session ownership and durable retries. The optional launcher reuses that command and lock rather than introducing another processing loop. A separate publisher refreshes the owned Drive brief and current Todoist/Retro context; its initially cached-only rollout is now upgraded with bounded pending classification. General reconciliation remains planned.

The automatic classification upgrade adds an opt-in pending-mail stage to the separate publisher. It processes at most ten due current jobs, uses a durable lifetime allowance and then refreshes cached publication with live source context. General reconciliation remains planned. The merged template was activated after a coordinated release/migration upgrade, as recorded below. See docs/automatic-mail-classification.md.

On October 25, merged PR #23 was activated for both native jobs after backup and migration 0005. A genuine recurring run classified ten conversations and published the owned artifact; collection reported discovery caught up and zero retrieval gaps at that observation. This does not imply complete classification or Retro coverage. The new opt-in capture stage is implemented for review but is not active: it follows classification inside publisher ownership, shares the manual writer lock and lifetime inference allowance, and stops after one successful task creation. See docs/automatic-capture-evidence.md and docs/automatic-todoist-capture.md.
