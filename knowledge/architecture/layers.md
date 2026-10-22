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
  at: 2026-10-22T04:10:40.938Z
stale_after: 2026-11-10T02:21:58Z
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
    sha256: a88e88277fc39a82d34caaa525fabd9eb1607d540f84695cfe38afa1e5e85a06
  - path: src/application/ports.ts
    sha256: 1a490007fcc489ecc38d1118a20d3f7ec0dce1f10957a17a8ad5b1fc70fffd71
  - path: src/domain/README.md
    sha256: 7d0d31f43ea8089296e0fa9e14ace8a7db2f1c3b627630082ed33a0499d2597c
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 57608a033d0e0b7e39ae997a387239b8b34ae35720ffcf68f2039cdb06fec00d
  - path: src/application/ingest-mail.ts
    sha256: deccd11cf8e73ebca2276f8480adbe2f1843cf55cfeee29c4076b2b2beb67a18
  - path: src/application/sync-mail.ts
    sha256: cb03f2894dec68d3a0935f2c24e002cb92c56d8fe70e493598eb2b52b7a6c891
  - path: src/cli-mail-sync.ts
    sha256: 3215916c5e8c32599ed344614b05a42d9986d9cf75b8a3ca392f66e0cf9785d7
  - path: src/cli-mail-triage.ts
    sha256: 14331026245dbb33b0e82cd31f68b304d8791f45167adf49e587694578b056f2
  - path: src/adapters/postgres/mail-triage.ts
    sha256: b05c6fc375b98f2b81964291761c7c2733565ebc2e0db59f77336389ffb2bf7f
  - path: src/application/email-tasks.ts
    sha256: b863ceb3d61d8dc0313ae392b1b9502a4a0ebeda6727b4cfdc102f741875cf65
  - path: src/cli-email-tasks.ts
    sha256: 03d03bcd3477bab151136626c8801c25267d15727583299a547fe616242f33e1
  - path: src/application/email-brief.ts
    sha256: a651539dbbc06c8c10a8fef0635f3a53770a12a24e4a0ee9bda78af4bfdd1e30
  - path: src/domain/email-brief.ts
    sha256: dd30c6ba2d7615bc2977f0b9d725fabee5da681c558dd7efb35f6abd03ace95b
  - path: src/cli-email-brief.ts
    sha256: 5543e0b5f17020ac17a8fe314a04827ca33cd5d5a6b2c9b0add93695394a8300
  - path: src/adapters/drive-brief.ts
    sha256: 808826c574c8867edfee2ef3aabc700d739a4f6f7dc82f0b6200159c458277b6
  - path: src/adapters/postgres/email-brief.ts
    sha256: 21166686962ee9a41f1c7dcc9e240072887895023ef34e5d5869786a6be615ce
---

# Application boundaries and composition

`src/cli.ts` is the composition root. Configuration is explicit. Application use cases depend on ports; adapters implement Google, Todoist, Jev and PostgreSQL I/O. `src/domain/` implements pure evidence fingerprints and reviewed email-task choices; general obligation matching, completion and freshness policy remain planned. Manual [Gmail preview](gmail-evidence.md) uses a reader port and shared budgets, with command composition in the CLI and its helper.

The small [reviewed task flow](/product/todoist-projects.md) has its own domain/application/CLI modules and SDK/PostgreSQL adapters. Preview has no write port. Apply revalidates explicit selections, holds a dedicated session lock and dispatches outside SQL transactions, then atomically settles the existing intent/link tables. No new framework, dependency, migration or background cycle is introduced.

Manual [durable ingestion](mail-ingestion.md) reuses the reader use case and writes through a separate SDK-free evidence-store port. Domain validation snapshots complete evidence before the adapter transaction; Drizzle rows remain inside the PostgreSQL adapter.

Inject runtime time/identity and provider ports so offline tests do not require credentials or current wall-clock behavior. SDK response shapes stay at the adapter boundary. Validate external/model data before it enters application decisions.

Do not perform remote calls inside database transactions. Separate durable ingestion from classification and remote writes. See [ledger](/architecture/ledger.md), [processing cycle](processing-cycle.md), and [test isolation](/operations/test-isolation.md).

Manual [incremental sync](mail-sync.md) now coordinates a reader and a session-owned persistence port. Discovery, retrieval retries and evidence freshness remain separate from classification. The CLI creates the provider only after mailbox ownership is granted; no provider request occurs within a database transaction.

DB-only [mail observation](/operations/mail-observation.md) has its own SDK-free reader and read-only transaction. It does not request sync ownership or construct provider clients. The application validates the fixed report shape and converts unavailable/malformed reads to unknown measurements without exposing arbitrary data.

Manual [triage](classification-policy.md) reads bounded exact job evidence through a separate SDK-free port. The read-only transaction closes before Jev requests. Domain code supplies finite criteria and validates answers; a shared budget bounds/cancels sequential calls. Reports exclude input content/identifiers and the preview has no persistence or task-write port.

Gmail admission policy stays inside its existing adapter module: monotonic pacing, abortable waits and structured throttle interpretation share the reader interface. The generic `MailBudget` remains usable by Jev. Collection orchestration owns selection stop/backoff; MIME parsing propagates terminal throttling instead of replacing it with a body-coverage status. The architecture review retained existing ports, transactions and recovery structure.

The manual [Drive brief](planner-handoff.md) has one small use case with SDK-free database/publication ports. Domain code owns cache identity and the Markdown template; the existing Jev adapter supplies finite triage. PostgreSQL owns selection/atomic persistence/reserved identity, and Drive owns metadata/content verification. The CLI binds credentials and a bounded command budget. It adds no framework, dependency, migration or background cycle.
