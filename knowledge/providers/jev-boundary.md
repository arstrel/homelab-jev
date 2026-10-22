---
type: Contract
title: Jev adapter and judgment boundary
description: Bounded typed triage is implemented; evaluated matching, routing and capture remain planned.
tags:
  - providers
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T01:53:00Z
stale_after: "2026-11-10T02:21:58Z"
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/jev.ts
    title: src/adapters/jev.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
x_jev_sources:
  - path: src/adapters/jev.ts
    sha256: 9018768dc73a9852ea92a2c208b29441bfb2573a7b34d24290a09b6d6573642b
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
  - path: src/adapters/jev-triage.ts
    sha256: b88247e2ac8d915a1f365b46a7d3fe04fdd1207eec715d9aaac1eca7f5ce0646
  - path: src/domain/mail-triage.ts
    sha256: 5476e6c425cd5c30430d78459f5faedb11b6d52fc297c64a624fd9674768c7db
  - path: src/adapters/jev-email-tasks.ts
    sha256: becaf504e775f5fc0e98cbb711246db2ac6e2346e2ac682be60855821dfe5ee4
  - path: docs/email-task-pilot.md
    sha256: 85b61890174102ebcce5d61a51a6a542cd1961237288daa1a907ca2f380b6d2b
---

# Jev adapter and judgment boundary

The current TypeSafe AI SDK adapter checks model availability with a bounded read-only call, retries disabled and SDK logging disabled. `JEV_API_KEY` belongs only in local/runtime secret configuration.

The explicit `mail:classify` preview asks independent kind, attention and lifecycle choices on complete stored evidence. Zod validates exact keys, enum choices, numeric probabilities/confidence, usage and returned model identity. Policy `mail-triage/v1` uses live-confirmed numeric model revision `jev-1.13.0`; mutable aliases are rejected. The initial setting is uncalibrated. Preview leaves storage/jobs/tasks unchanged. Matching and routing remain planned. No model output can extend project IDs, bypass manual overrides or request arbitrary tool execution.

Only necessary subject/body/timestamp/direction state is sent, capped at 32 KiB without truncation; address lists, dedicated source IDs and attachment contents are omitted. Body text can contain private information. Calls have five-second timeouts, disabled retries/logging and shared cancellation/deadline bounds. Use [evaluation](/operations/classification-evaluation.md) to choose later thresholds, and follow [classification policy](/architecture/classification-policy.md).

The v2 reviewed-task adapter asks eligibility separately from sentence/project selection in one request and checks the complete serialized request against the 32 KiB bound. Literal criteria quote source/project data; finite validated output cannot grant new destinations or actions. A tiny six-case live synthetic check and an explicitly approved ten-conversation fresh preview are development/pilot evidence, not a classifier-accuracy benchmark or permission for unattended capture.
