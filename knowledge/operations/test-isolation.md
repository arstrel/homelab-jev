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
  at: 2026-10-18T23:36:37.354Z
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
    sha256: c0344ae6ab4000cf268b12bd383eb3ca88bd2ac1cf22efcd9c8680cc19cfa727
  - path: tests/integration/mail-sync.test.ts
    sha256: bdeae9fbb07c94896aa0c790803230b2e0409bc9c220e2573f8c174c77568326
  - path: tests/adapters/gmail-sync.test.ts
    sha256: ded556b50ec7829f3d4fa7d06c400517ed31377a0c0b92261ed2d7c7ee8f1e49
  - path: tests/unit/mail-sync.test.ts
    sha256: b5d0fd755cc374791794fd1ec89f60172e2e975a8f90f0916b416d61ba485f8d
---

# Offline and database test isolation

Offline test wrappers strip operational environment variables. Test setup rejects inherited live configuration and disables environment-file loading. MSW fails unhandled requests. Fake clocks and IDs make relevant behavior repeatable; UTC is the test timezone.

PostgreSQL checks use a disposable pinned PostgreSQL 17 Docker container or validated CI test service. The runner binds local ports and cleans up its own labeled container. Never substitute the production `DB_URL` or load `.env` into the test suite.

Current tests cover configuration, Git guards, bounded SDK contracts, repeatable Google authorization and migration/ledger behavior. New OKF tests cover parsing, metadata, root/relative navigation, escaping, confinement, drift and server boundaries. These are documentation-tool tests, not classifier quality evidence. Synthetic Gmail suites now cover normalized evidence, fingerprints, bounded reads, MIME coverage and preview privacy. Credentialed live previews remain manual and outside tests/CI; their counts do not establish classifier quality.

Durable-ingestion fixtures now test immutable versions, exact lookup, concurrent replay, rollback, legacy recovery and the application-to-PostgreSQL path using synthetic mail only. Migration tests retain populated prior-version data through failure and repair. No operational ingestion result is claimed.

See [development gates](development-gates.md) and [classification evaluation](classification-evaluation.md).

Sync fixtures now exercise resumable discovery, bootstrap overlap, partial retries with no new mail, checkpoint/evidence rollback, classification transaction failure, stale generations, and dedicated ownership loss via terminating only a disposable PostgreSQL backend. Provider contracts remain MSW-only; no live sync is performed by tests.
