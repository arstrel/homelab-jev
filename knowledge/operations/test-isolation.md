---
type: Invariant
title: Offline and database test isolation
description: Tests must not consume live credentials or mutate the homelab database.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-19T03:02:02.103794Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/tests/setup.ts
    title: tests/setup.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/environment.ts
    title: scripts/environment.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/integration.ts
    title: scripts/integration.ts
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/test-database.ts
    title: scripts/test-database.ts
  - id: s5
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/vitest.config.ts
    title: vitest.config.ts
x_jev_sources:
  - path: tests/integration/mail-status.test.ts
    sha256: 013f32313a277ed47c6c35ef4d11fd7c85c9a4fd3ea99a37d6ddd81448380efc
  - path: tests/unit/mail-status.test.ts
    sha256: 94fcb2b4a492fe368522e6ae4a0ce95b28450a9884d28a6dec6b22b54d1a51c3
  - path: scripts/cli-smoke.ts
    sha256: f6f277d7fbd64596ed948a05d95bc98f7647f27a18882a0c0031ba8949035b9f
  - path: tests/setup.ts
    sha256: 848618590ddc9c3f5f53c84b13b41537b040c7f0c62ad0c6ba3cd41caab706b3
  - path: scripts/environment.ts
    sha256: 6e4a9460d77b59845f2018f61e7ee997251468df6aed14c37b59138171bca921
  - path: scripts/integration.ts
    sha256: 30bc45276432ea3fd957c0c6f192fe974da363117eceaa5c4d989eb08b96bcf6
  - path: scripts/test-database.ts
    sha256: 516db02eeb84abdad4de88dff06a2fb564dce2491a5bb1d0d84cad23a3949535
  - path: vitest.config.ts
    sha256: 2343aa99265208e2c873f2683d22139081a37cbd6be76b72b2f78eae94ffc38a
  - path: tests/integration/mail-ingestion.test.ts
    sha256: 92805931f6f060fe72af9fd17b87bcee6f329ee72270012d44daf9b57d318942
  - path: tests/integration/mail-sync.test.ts
    sha256: d107036f77d477c3ae105bbc528bc5e10235c1a6789afde0760c5579e157c90a
  - path: tests/adapters/gmail-sync.test.ts
    sha256: ded556b50ec7829f3d4fa7d06c400517ed31377a0c0b92261ed2d7c7ee8f1e49
  - path: tests/unit/mail-sync.test.ts
    sha256: 6db9df740bdeabf5013309fb60a65d786fd518eaf8fd425e1e4f2fe689451fba
---

# Offline and database test isolation

Offline test wrappers strip operational environment variables. Test setup rejects inherited live configuration and disables environment-file loading. MSW fails unhandled requests. Fake clocks and IDs make relevant behavior repeatable; UTC is the test timezone.

PostgreSQL checks use a disposable pinned PostgreSQL 17 Docker container or validated CI test service. The runner binds local ports and cleans up its own labeled container. Never substitute the production `DB_URL` or load `.env` into the test suite.

Current tests cover configuration, Git guards, bounded SDK contracts, repeatable Google authorization and migration/ledger behavior. New OKF tests cover parsing, metadata, root/relative navigation, escaping, confinement, drift and server boundaries. These are documentation-tool tests, not classifier quality evidence. Synthetic Gmail suites now cover normalized evidence, fingerprints, bounded reads, MIME coverage and preview privacy. Credentialed live previews remain manual and outside tests/CI; their counts do not establish classifier quality.

Durable-ingestion fixtures now test immutable versions, exact lookup, concurrent replay, rollback, legacy recovery and the application-to-PostgreSQL path using synthetic mail only. Migration tests retain populated prior-version data through failure and repair. No operational ingestion result is claimed.

See [development gates](development-gates.md) and [classification evaluation](classification-evaluation.md).

Sync fixtures now exercise resumable discovery, bootstrap overlap, partial retries with no new mail, checkpoint/evidence rollback, classification transaction failure, stale generations, and dedicated ownership loss via terminating only a disposable PostgreSQL backend. Provider contracts remain MSW-only; no live sync is performed by tests.

Recovery fixtures cover stage-by-stage restarts, a 101-thread mapped snapshot, older/missing/partial mail, history catch-up, repeated expiry caps, preserved backoff, stale initialization/final-page rollback and populated 0004 failure/repair. Read-state replay preserves evidence/job identity. These results establish synthetic recovery behavior only.

Observation tests verify read-only transaction enforcement, schema readiness without setup, coherent aggregates across concurrent commits, observation during held sync ownership, and sanitized connection loss. Fixture initialization inserts typed sync state directly; it does not race teardown of an unnecessary setup ownership session against the test's lock acquisition. Disposable schema resets and backend termination remain confined to the validated test database. The compiled DB-only diagnostic uses a fake failing driver with network access denied; live pilot acceptance is never a Git gate.
