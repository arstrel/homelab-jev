---
type: Contract
title: Jev adapter and judgment boundary
description: The SDK connection exists; typed obligation judgment use cases remain planned.
tags:
  - providers
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-11T02:21:58Z"
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
---

# Jev adapter and judgment boundary

The current TypeSafe AI SDK adapter checks model availability with a bounded read-only call, retries disabled and SDK logging disabled. `JEV_API_KEY` belongs only in local/runtime secret configuration.

Future use cases ask narrow typed questions about evidence, matches and routing. Schema validation and deterministic code decide what can be persisted or written. No model output can extend project IDs, bypass manual overrides or request arbitrary tool execution.

Avoid sending whole mailbox history when a bounded thread and candidate list suffice. Pin and record the chosen model and policy version when classification is implemented. Use [evaluation](/operations/classification-evaluation.md) to choose thresholds, and follow [classification policy](/architecture/classification-policy.md).
