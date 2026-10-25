---
type: Runbook
title: Native Node releases and scheduling
description: Deploy reviewed compiled releases with explicit migrations and
  bounded launchd cycles.
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
    sha256: d9cff016d5cd902a8459361782f5bfd918cbc687fecccd2f82beb973a977eb95
  - path: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    sha256: cb573cbb85a6a53ad61363014df299c6f4eea8b6707a48b6aeb1d99b639e0408
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 98b91697539d06bf087cdef36597cf2a73dad4b69edaf7e377005215cb7334c6
  - path: scripts/mail-worker.ts
    sha256: 87ff1739e86a7a02fa241e6a4b5253e0547d9ad39a5513c24314454ece280a4c
  - path: scripts/mail-worker-cli.ts
    sha256: efd8f407d3f8c656d9e2f22ac1dec4a9fd2b8dc67ab806e5115bec3c62454b75
  - path: docs/mail-worker-evidence.md
    sha256: 90d70e598cfa14dd1161fa7fd244ed1f24b74e21048ac8a3d05b66f2c9e0ab10
  - path: docs/automatic-capture-evidence.md
    sha256: 1bcd2644ec0a175fc173ab9c3fd52d1108de68ff9ab14a50e7de4913abb00c78
  - path: deploy/brief-refresh.md
    sha256: 11683cc53fce5817189291ddc34e7d0c4e03f0c09d56f68ead4f5bf07486a46e
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# Native Node releases and scheduling

Use reviewed compiled Node 24 releases independent of the editable checkout. Collector tooling prepares immutable release directories, checks operational schema without migrating, and installs a one-shot launchd job with explicit runtime/environment/release paths. `worker install|start|stop|status` controls it; current.json records the selected configuration and each plist names its resolved release.

The collector runs at load and every 300 seconds, requiring a logged-in GUI session and an awake host. A dedicated PostgreSQL session owns its lock; overlap skips provider work. Stop disables activation/unloads the job, retaining ledger records. Activation failure attempts to restore the previous configuration. Logs/backups remain private; retention/rotation are explicit maintenance, not automatic deletion.

A separate publisher runs every five minutes. October 25 migration-aware release 7f7cda11d08c85673a5744ea1c2c0a37bfffe7c1 was activated for both jobs after a private validated backup and explicit migration 0005. Real recurring classification/publication and owned-file readback passed with zero retrieval gaps at observation.

Capture was enabled on the publisher after merged PR #25, with a fresh source-time boundary, verified Retro exclusion and three-intent rolling cap. PR #26's merged release 9e891ec4f8992a3d9a76dabab7adb84c343f23e6 then corrected the capture-aware header; owned-file readback and subsequent timer publication passed. The collector remained on the compatible PR #23 release. Zero eligible capture work established wiring, not useful task creation. Later zero-work collector reports establish scoped freshness acceptance, not uninterrupted future health.

Apply migrations explicitly and retain allowance/mapping/intent history across upgrades. To disable unattended inference but retain publication, remove both --classify-pending and --capture-tasks, leaving --max-new 0 and no --retro-review. Removing capture alone leaves classification enabled. Never reverse a schema automatically or deploy an incompatible old release.

Repository runbooks `deploy/README.md` and `deploy/brief-refresh.md`, and evidence `docs/mail-worker-evidence.md` / `docs/automatic-capture-evidence.md`, are authoritative. Full cross-provider interruption and isolated backup-restore/release rollback acceptance remain unfinished. See [processing](/architecture/processing-cycle.md), [migrations](database-migrations.md) and [delivery](/product/delivery-boundary.md).
