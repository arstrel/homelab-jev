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
  at: 2026-10-19T14:41:33Z
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
    sha256: 893a433a2878b505872f14719cced7bfede0521b4c505e203de0b9e1fda749a3
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
  - path: docs/connections.md
    sha256: f887016114368f775e58c0c7945b8117f9ee016483a4e730842c8a06bdb196c8
  - path: src/adapters/todoist-email-tasks.ts
    sha256: 991923e7038efc1870c2e9c795e9639d4366619dccd4fe00fb59e80ea1d1d212
  - path: docs/email-tasks.md
    sha256: da69ac8a376614a70007889044d663a33c5c65b7cc2b8433d33434b9a2cd5b06
---

# Todoist identity and adapter contract

The worker currently uses its own `TODOIST_API_TOKEN`. The SDK connection check reads one page of projects. OAuth is not currently implemented or required for this single-account token setup. Do not imply the ChatGPT Todoist connection supplies credentials to Node.

Project names and descriptions can change. Runtime discovery constrains reviewed routing to active IDs and excludes Retro. The manual task adapter reads at most five pages of 100 projects and rejects an incomplete inventory; the separate bounded diagnostic page is not a complete inventory sync. General task synchronization remains planned.

The implemented [reviewed task flow](/product/todoist-projects.md) paginates active project discovery and creates explicitly selected tasks using a saved caller `X-Request-Id`, Gmail source link and stable source marker. Transport failures do not trigger SDK replay. Ambiguous creates block subsequent creation and require manual inspection; full task synchronization and automated reconciliation remain planned. Follow [remote write safety](/architecture/remote-write-safety.md), [manual edits](/architecture/manual-edits.md), and [project routing](/product/todoist-projects.md).
