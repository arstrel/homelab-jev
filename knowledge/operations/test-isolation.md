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
  at: "2026-10-11T02:21:58Z"
stale_after: "2026-11-10T02:21:58Z"
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
---

# Offline and database test isolation

Offline test wrappers strip operational environment variables. Test setup rejects inherited live configuration and disables environment-file loading. MSW fails unhandled requests. Fake clocks and IDs make relevant behavior repeatable; UTC is the test timezone.

PostgreSQL checks use a disposable pinned PostgreSQL 17 Docker container or validated CI test service. The runner binds local ports and cleans up its own labeled container. Never substitute the production `DB_URL` or load `.env` into the test suite.

Current tests cover configuration, Git guards, bounded SDK contracts, repeatable Google authorization and migration/ledger behavior. New OKF tests cover parsing, metadata, root/relative navigation, escaping, confinement, drift and server boundaries. These are documentation-tool tests, not classifier quality evidence.

See [development gates](development-gates.md) and [classification evaluation](classification-evaluation.md).
