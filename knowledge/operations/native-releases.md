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
  at: 2026-10-25T18:27:08Z
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
    sha256: 57608a033d0e0b7e39ae997a387239b8b34ae35720ffcf68f2039cdb06fec00d
  - path: scripts/mail-worker.ts
    sha256: 87ff1739e86a7a02fa241e6a4b5253e0547d9ad39a5513c24314454ece280a4c
  - path: scripts/mail-worker-cli.ts
    sha256: efd8f407d3f8c656d9e2f22ac1dec4a9fd2b8dc67ab806e5115bec3c62454b75
  - path: docs/mail-worker-evidence.md
    sha256: e7c1c9a9dcb0b8d7bc10c289ac6a28960a5255b113343279c620b70943cb76ca
  - path: docs/automatic-capture-evidence.md
    sha256: 17c810b586d5b1769b6864d879f2185bb5ce2aa1db12f6712a3fc310cd69be3e
  - path: deploy/brief-refresh.md
    sha256: 94128809110944b597666a5b17c25a39195a9cc8c4c5e7b6389000cc89c97507
  - path: docs/automatic-todoist-capture.md
    sha256: fcdfa9ddc123dc963b3968d753d9a0273f2060f289eb2c4eba3e681f776074ab
---

# Native Node releases and scheduling

Use compiled Node 24 releases managed independently of the editable Git checkout. The collector deployment tooling (repository `deploy/README.md`) now prepares versioned releases and installs a collection-only launchd job with explicit Node, environment and release paths. `npm run worker -- install|start|stop|status` provides control. Install requires a clean checkout on fetched origin/main and a private environment file, then checks the candidate's operational schema without migrating. Release directories are reused, never rebuilt in place; current.json records the selected configuration and each plist points to its resolved release.

The agent runs bounded mail:sync once at load and every 300 seconds. A GUI login session is required; it cannot run before login or while the mini is asleep/off. Stop disables login activation and unloads the current job. Activation failure attempts to restore the previous configuration and loaded state. Logs remain private; rotation is an explicit stopped-worker maintenance step. Tooling does not imply an active deployment: consult the repository report `docs/mail-worker-evidence.md`.

Apply reviewed compatible migrations explicitly. Capture health, duration, last successful source synchronization and pending/retry counts with controlled logs. An advisory lock prevents overlapping workers; calls and overall execution have deadlines.

Rollback should select a compatible previous release while preserving ledger records and user tasks. Do not assume SQL reversal is safe. Rehearse the migration/release rollback procedure before production capture.

A separate publisher runs the merged brief command every five minutes; the October 25 upgrade below activates pending classification. General reconciliation remains planned. See [processing cycle](/architecture/processing-cycle.md), [migrations](database-migrations.md), and [delivery boundary](/product/delivery-boundary.md).

On October 21 Pacific, merged collector release ae4477994fa7558717e451c31d2f01a0c2f6f349 was activated. Two automatic invocations added 35 complete versions/jobs, and an overlapping manual invocation skipped with no provider work. The recorded snapshot retained 488 retrievals and null evidence freshness; full catch-up/no-change acceptance remains open. This is timestamped operational evidence, not a continuing health guarantee. The separate cached-only publisher preserves the collector configuration and schedules no hosted inference. See the repository runbook deploy/brief-refresh.md and evidence docs/scheduled-brief-evidence.md.

On October 25, both jobs were upgraded to merged release 7f7cda11d08c85673a5744ea1c2c0a37bfffe7c1 after a private validated backup and explicit migration 0005. Genuine subsequent timer reports confirmed ten classifications, publication and zero current retrieval gaps; independent owned-file readback passed. This is timestamped acceptance, not a continuing health guarantee. The proposed capture flag is not installed. Enable it only from its merged reviewed immutable release with an explicit source-time boundary; removing the flag disables new task effects while retaining ledger history. See docs/automatic-capture-evidence.md and the repository runbook deploy/brief-refresh.md.
