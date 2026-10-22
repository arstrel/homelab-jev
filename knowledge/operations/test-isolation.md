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
  at: 2026-10-22T13:58:41.729Z
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
    sha256: fbb9104380a5cc53a3d3d161777f2aa61be56c3db5df28a5f10e039037e9d3f4
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
    sha256: 049008cf40812389ef3b01911cf1c3f01ec6a6a257d440aa7e4de69641ec56e4
  - path: tests/adapters/gmail-sync.test.ts
    sha256: 2d0d02c586dbe4766d90d0d0b254eb6ea429a3fd2d71fd630628d90783669f83
  - path: tests/unit/mail-sync.test.ts
    sha256: c029b2ef11bc8ccc4db0c3770395b06beee32073af0ec7de0d4f930a08b9cdb6
  - path: tests/unit/mail-triage.test.ts
    sha256: d0b8ffd5ed626c9976924a797c2338e9e0d30fb40235eee606ca02d4ebceed77
  - path: tests/adapters/jev-triage.test.ts
    sha256: 00599738213ca9d2fff6049c28de8b1c0156fc185bf4bea742969c93b8446a11
  - path: tests/integration/mail-triage.test.ts
    sha256: bc1de0b163fa87580ba65753e30f6752d28d247355f31a29a1c96a3f08ad14c3
  - path: tests/adapters/gmail-pacing.test.ts
    sha256: 6889af2294f388336b9479623187f7ff7575b2cd5c685798c81a73c98cc7492f
  - path: tests/fixtures/gmail-timing.ts
    sha256: 003deddbaa38980f664af34855d2a1d869ba31213278adbfa312f35e4b28c8db
  - path: tests/unit/mail-preview.test.ts
    sha256: 9d3cb01ea7441e210a89c504d124b5fde5b1dcd9fab2e8c46b42b5ddb5e9a28d
  - path: tests/unit/mail-ingestion.test.ts
    sha256: cff8f13effa4351a59b05e923cc76f01e4232fcf18db0475cbb58cb9bcf4c5d9
  - path: tests/unit/email-tasks.test.ts
    sha256: fbfa59b4d5dcc2e1ef9dd89867e1ea7178990d45fb39957034731a2b92726b0a
  - path: tests/adapters/email-tasks.test.ts
    sha256: 442ded653b33a0e662b371599feaff3869a3fdfabb2f6e1d7cf6cc5210581fdb
  - path: tests/integration/email-tasks.test.ts
    sha256: 17311efcd698ac34909bc1128fb1f5ec26974f525c8e6a2617537fa6748dc54a
  - path: tests/unit/todoist-brief.test.ts
    sha256: 0fc3a577b5fc653deeb775573efda07b99c72fcf590ab006718fa4cc387b517c
  - path: tests/adapters/todoist-brief.test.ts
    sha256: 5d549dad277889e55be04a102eafb802191512ff3a4c6694f41484f8a59e89be
  - path: tests/unit/retro-review.test.ts
    sha256: 4440613731c443784f92ed29d569af7eb74207efbaa83ada6ecb99c55021fadf
  - path: tests/adapters/jev-retro.test.ts
    sha256: 17ea80ef6bd0cf76c08f10882f77627686171b316ce345422a49367c164b8022
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

Triage tests use synthetic conversations, fixed results and MSW for malformed answers, hostile-state boundaries, cancellation and timeout/no-retry contracts. Disposable PostgreSQL tests select exact historical versions, preserve legacy gaps and detect corrupt evidence while leaving jobs/results unchanged. Credentialed Jev checks are explicit separate operations; deterministic gates never send real mail to Jev or claim measured classifier quality.

Gmail admission tests cross the reader interface using synthetic transport responses and controlled monotonic timing, including concurrent reads released by a slow OAuth refresh. Separate production-wait tests cover cancellation/deadline without live calls. Body-part throttling remains terminal. Disposable PostgreSQL coverage verifies earlier commits, the failed item’s durable backoff, untouched later work, recognized diagnostics and a successful due retry. These tests do not establish live quota headroom or completed collection acceptance.

Reviewed task tests use synthetic source sentences, projects and remote responses. Offline tests cover selected creation and a network error without SDK replay; disposable PostgreSQL verifies persisted uncertainty, repeated/overlapping apply and transactional settlement rollback. Compiled command checks remain network-denied. No real mail transfer or Todoist write is performed.

V2 tests add independent eligibility rejection, contextual review-title validation, old review-file rejection with stable write identity, complete request bounds and message-recency ordering. Synthetic gateway tests validate code behavior under supplied judgments, not semantic model accuracy. Live synthetic/fresh-mail checks remain separate from deterministic gates.

Brief publication tests use synthetic evidence, fixed judgments and MSW Drive responses. Disposable PostgreSQL verifies atomic exact-job completion and classification rollback, selection, reserved identity and prior-publication metadata. No operational credentials, real private content or live Drive publication are used in gates. Cached-only publication is also tested without an inference request.

Read-only Todoist context uses synthetic SDK HTTP fixtures and controlled application reads to verify changed/moved/removed tasks without mutating live tasks. Tests cover exact-link associations, filtering, incomplete/failed reads and cached-only refresh without extra inference. Live verification separately publishes the private artifact; no private task data enters committed fixtures.

Retro tests use invented feedback/task text and mocked completed-task/comment/Jev responses. They establish code behavior under supplied judgments, including preserved activities/goals, unknowns, malformed outputs, hostile source text and cap/deadline behavior. A separate bounded live development evaluation is not a held-out accuracy benchmark; no private feedback enters committed fixtures.
