---
type: Architecture
title: Application boundaries and composition
description: Keep pure decisions separate from provider and database side effects.
tags:
  - architecture
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/cli.ts
    title: src/cli.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/application/ports.ts
    title: src/application/ports.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/domain/README.md
    title: src/domain/README.md
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
x_jev_sources:
  - path: src/cli.ts
    sha256: 85f0bedd18484ad0e7e77c632e24db86f804d3412aff38d15d920985e273de8c
  - path: src/application/ports.ts
    sha256: ca5c095dab4bd2c81683b6f4e156a2bb95a693d986eaebe8296d3a07d7607887
  - path: src/domain/README.md
    sha256: 2c8d04c8478e6ff89ddb9e94432835a46647a5db37b100847e4a9289f2116982
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 1ae7c84b9957c1449c1f66a4e192f822883abcd15353e29e825987b06be1a479
---

# Application boundaries and composition

`src/cli.ts` is the composition root. Configuration is explicit. Application use cases depend on ports; adapters implement Google, Todoist, Jev and PostgreSQL I/O. `src/domain/` is reserved for pure obligation identity, matching, routing, completion and freshness rules; those domain rules remain to be implemented.

Inject runtime time/identity and provider ports so offline tests do not require credentials or current wall-clock behavior. SDK response shapes stay at the adapter boundary. Validate external/model data before it enters application decisions.

Do not perform remote calls inside database transactions. Separate durable ingestion from classification and remote writes. See [ledger](/architecture/ledger.md), [processing cycle](processing-cycle.md), and [test isolation](/operations/test-isolation.md).
