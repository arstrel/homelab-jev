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
  at: 2026-10-19T03:33:58.003653Z
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
    sha256: 96bf2ee2199d7b16e89256019dc31664288b6a93eeff3167f1b21453f68254b9
  - path: src/application/ports.ts
    sha256: 1a490007fcc489ecc38d1118a20d3f7ec0dce1f10957a17a8ad5b1fc70fffd71
  - path: src/domain/README.md
    sha256: 7d0d31f43ea8089296e0fa9e14ace8a7db2f1c3b627630082ed33a0499d2597c
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 57608a033d0e0b7e39ae997a387239b8b34ae35720ffcf68f2039cdb06fec00d
  - path: src/application/ingest-mail.ts
    sha256: deccd11cf8e73ebca2276f8480adbe2f1843cf55cfeee29c4076b2b2beb67a18
  - path: src/application/sync-mail.ts
    sha256: bb92f1d81ddade4e29268c7ee9a10fb878f5ffeb3c8b753bbaa35349b69765df
  - path: src/cli-mail-sync.ts
    sha256: 3215916c5e8c32599ed344614b05a42d9986d9cf75b8a3ca392f66e0cf9785d7
  - path: src/cli-mail-triage.ts
    sha256: 14331026245dbb33b0e82cd31f68b304d8791f45167adf49e587694578b056f2
  - path: src/adapters/postgres/mail-triage.ts
    sha256: b05c6fc375b98f2b81964291761c7c2733565ebc2e0db59f77336389ffb2bf7f
---

# Application boundaries and composition

`src/cli.ts` is the composition root. Configuration is explicit. Application use cases depend on ports; adapters implement Google, Todoist, Jev and PostgreSQL I/O. `src/domain/` implements pure mail-evidence types and fingerprints; obligation identity, matching, routing, completion and freshness policy remain planned. Manual [Gmail preview](gmail-evidence.md) uses a reader port and shared budgets, with command composition in the CLI and its helper.

Manual [durable ingestion](mail-ingestion.md) reuses the reader use case and writes through a separate SDK-free evidence-store port. Domain validation snapshots complete evidence before the adapter transaction; Drizzle rows remain inside the PostgreSQL adapter.

Inject runtime time/identity and provider ports so offline tests do not require credentials or current wall-clock behavior. SDK response shapes stay at the adapter boundary. Validate external/model data before it enters application decisions.

Do not perform remote calls inside database transactions. Separate durable ingestion from classification and remote writes. See [ledger](/architecture/ledger.md), [processing cycle](processing-cycle.md), and [test isolation](/operations/test-isolation.md).

Manual [incremental sync](mail-sync.md) now coordinates a reader and a session-owned persistence port. Discovery, retrieval retries and evidence freshness remain separate from classification. The CLI creates the provider only after mailbox ownership is granted; no provider request occurs within a database transaction.

DB-only [mail observation](/operations/mail-observation.md) has its own SDK-free reader and read-only transaction. It does not request sync ownership or construct provider clients. The application validates the fixed report shape and converts unavailable/malformed reads to unknown measurements without exposing arbitrary data.

Manual [triage](classification-policy.md) reads bounded exact job evidence through a separate SDK-free port. The read-only transaction closes before Jev requests. Domain code supplies finite criteria and validates answers; a shared budget bounds/cancels sequential calls. Reports exclude input content/identifiers and the preview has no persistence or task-write port.
