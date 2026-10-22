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
  at: 2026-10-22T13:58:41.710Z
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
    sha256: 202b9101e7fbd5caf158d98985648dd13eeb26ca12b821e84c0c6eb13679d73a
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
    sha256: 14cefe6cfebfe20a1cafcc99e26f6cba0cc4926060826587ec92d6d64bc2240e
  - path: src/domain/email-brief.ts
    sha256: 8ce409f2ead0df548d76472e94994940913ebcc21549e10d642da992987be9fa
  - path: src/cli-email-brief.ts
    sha256: 7feef65d8f1130a1f3e95a1ce6166d866f30c71d7445225485d433852c94e044
  - path: src/adapters/drive-brief.ts
    sha256: 808826c574c8867edfee2ef3aabc700d739a4f6f7dc82f0b6200159c458277b6
  - path: src/adapters/postgres/email-brief.ts
    sha256: 21166686962ee9a41f1c7dcc9e240072887895023ef34e5d5869786a6be615ce
  - path: src/adapters/todoist-brief.ts
    sha256: 175e6f795d3f62cef8009803e1f974f1bc96655624ce85f0eabf0dba90d45be7
  - path: src/domain/todoist-brief.ts
    sha256: 97e80af779dba85133ded6ac4e92c5b7095da7b32297f6bb1997561e6b660e5e
  - path: src/domain/brief-text.ts
    sha256: 18b4b488bbcc7624c840e9d43503c61c47fe801438c9d3e99e143f29b75a08b2
  - path: src/application/review-retro.ts
    sha256: 18a777d202fc3f64612316601ad6b77df0767796c5626e36851b94524bfa4976
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

The brief also has one SDK-free Todoist read port. Its adapter bounds current pages and extracts explicit Gmail links locally; pure domain code renders project tasks and associations using the shared text escaper. Todoist never enters triage questions/cache identity, and no task inventory table or remote write port is added. Provider failures are rendered as unavailable context; cancellation still stops publication.

The manual Retro slice adds SDK-free source/review types and a small review use case. Todoist owns bounded open/completed/comment retrieval; Jev owns typed choice transport. Domain code constrains task references, exact excerpts and review labels. The existing publisher shares its cap/deadline and writes the same Drive artifact. No schema, dependency, service, task-write port or new cache is introduced.
