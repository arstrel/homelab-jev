---
type: Contract
title: Todoist identity and adapter contract
description: Current SDK reads and request IDs support a planned authoritative-task synchronization loop.
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/todoist.ts
    title: src/adapters/todoist.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/connections.md
    title: docs/connections.md
x_jev_sources:
  - path: src/adapters/todoist.ts
    sha256: 25d3f3101d99bef99549310651b2c86b35ff3422c7588d186ecc635ee24415da
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: docs/connections.md
    sha256: f887016114368f775e58c0c7945b8117f9ee016483a4e730842c8a06bdb196c8
---

# Todoist identity and adapter contract

The worker currently uses its own `TODOIST_API_TOKEN`. The SDK connection check reads one page of projects. OAuth is not currently implemented or required for this single-account token setup. Do not imply the ChatGPT Todoist connection supplies credentials to Node.

Project names and descriptions can change. Runtime discovery must constrain routing to active IDs and exclude the configured Retro identity. Paginate production inventory reads when synchronization is implemented; the bounded diagnostic page is not a complete inventory sync.

The adapter preserves caller `X-Request-Id` values, but durable retry/reconciliation orchestration is still planned. Follow [remote write safety](/architecture/remote-write-safety.md), [manual edits](/architecture/manual-edits.md), and [project routing](/product/todoist-projects.md).
