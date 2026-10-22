---
type: Runbook
title: Node development and Git gates
description: Use exact pinned tooling and checks over the full staged validation input set.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T04:10:40.938Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/package.json
    title: package.json
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/check.ts
    title: scripts/check.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/git-gate.ts
    title: scripts/git-gate.ts
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/development.md
    title: docs/development.md
x_jev_sources:
  - path: package.json
    sha256: d1d1a771d83c4d41c3092e961bc2e0fc7c47766d1c3f28a476c2a66938bd37ad
  - path: scripts/check.ts
    sha256: 265c3bdb561a903fb53a7119604f76cdf9ef0be9d7932077d1e5ff8ec785d392
  - path: scripts/git-gate.ts
    sha256: d319d4731259e12a306add4853a84c0e4f5691b4bcd56d8e0ba5386010adde12
  - path: docs/development.md
    sha256: 8fb74e564a1b84d188dd79909103426efe1e04d191f0069e86bebcd3b2f522b0
  - path: scripts/cli-smoke.ts
    sha256: 398fff4132993872bd2529d60279609936c8dee41a9f9a18259a30ac27742b51
  - path: tests/unit/email-tasks.test.ts
    sha256: fbfa59b4d5dcc2e1ef9dd89867e1ea7178990d45fb39957034731a2b92726b0a
  - path: tests/integration/email-tasks.test.ts
    sha256: 17311efcd698ac34909bc1128fb1f5ec26974f525c8e6a2617537fa6748dc54a
  - path: scripts/mail-worker.ts
    sha256: 87ff1739e86a7a02fa241e6a4b5253e0547d9ad39a5513c24314454ece280a4c
  - path: scripts/mail-worker-cli.ts
    sha256: efd8f407d3f8c656d9e2f22ac1dec4a9fd2b8dc67ab806e5115bec3c62454b75
  - path: tests/unit/mail-worker.test.ts
    sha256: 0518c100be01d18dbf638dd3875a0ee6d05f350ef2972648484b7a9bca15f0a5
  - path: tests/unit/email-brief.test.ts
    sha256: a8be242ca043e82b3c8212064db12b7c1aa04280dce014be3190fda2cd573901
  - path: tests/adapters/drive-brief.test.ts
    sha256: 237288c05bf0e8138f88e7819a0f58fac03ac0945eccfbe8aa0929abe93de7d8
  - path: tests/integration/email-brief.test.ts
    sha256: a721685082df5ca0a19041bd788974e8a715ff6ffebf85e92a56cd8e216735b1
---

# Node development and Git gates

Use Node 24.21.0 and the pinned npm toolchain. Run `npm ci`, then `npm run check`. Biome checks formatting/linting without rewriting; TypeScript checks source/scripts/tests; Vitest/MSW runs offline cases; the CLI is compiled and smoke-tested without network; local document links and OpenSpec are validated. OKF validation joins this same gate. Pinned runtime address/HTML parsers support manual [Gmail preview](/architecture/gmail-evidence.md); its compiled option/configuration smoke checks remain offline. Build before invoking the credentialed preview npm command.

The compiled manual ingestion command requires explicit migrations and Google/database configuration. It is smoke-tested offline; disposable PostgreSQL verifies its persistence invariants. The normal gates never ingest operational mail or migrate the homelab database.

Pre-commit requires a fully staged application/config/documentation validation set and runs full offline checks. The input snapshot must remain unchanged during validation. Do not hide unstaged code to obtain a misleading pass. Use `npm run fix` explicitly when formatting changes are intended.

Pre-push repeats appropriate checks and runs PostgreSQL integration tests on disposable databases. Short-lived branches and PRs require both offline and PostgreSQL CI. Native releases are separate from an editable checkout.

See [test isolation](test-isolation.md), [migrations](database-migrations.md), and [OKF maintenance](okf-maintenance.md).

The explicit compiled `mail:sync` command is now validated offline, with durable ownership/restart/freshness tests in disposable PostgreSQL. It requires reviewed migrations and Google/database configuration. The normal gates never run credentialed synchronization or enable launchd.

The explicit `mail:classify` preview is also covered by offline compiled option/configuration checks and synthetic adapter/application tests. Disposable PostgreSQL checks exercise exact read-only evidence selection. Live Jev calls and private mail transfers are outside Git/CI gates.

The [reviewed task commands](/providers/todoist-boundary.md) are covered by synthetic offline application/transport tests, compiled option checks and disposable PostgreSQL apply/replay/settlement tests. These gates never send real email to Jev or create live tasks.

The v2 policy retains these gates and adds eligibility/title, review-version/request-bound and message-recency regressions. Live pilot reports remain separate; a passing gate does not establish capture quality.

Native collector deployment tests use real archive extraction and a tiny compiled fixture with fake package installation and launchctl. They verify release isolation, reviewed/clean checkout checks, schema preflight, stop/start and failed activation restoration without installing an agent or reading production credentials. The optional worker npm command is an operator action outside hooks/CI; actual recurring acceptance stays separate.

The manual [Drive brief](/architecture/planner-handoff.md) adds offline cache/cap/uncertainty/cancellation/template and HTTP ownership/create/update/read-back cases, compiled option/configuration checks and disposable PostgreSQL selection/atomicity/recovery/overlap tests. Gates never publish live Drive files or spend the owner's Jev allowance; live evidence remains a separate explicit operation.
