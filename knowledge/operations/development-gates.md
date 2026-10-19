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
  at: 2026-10-19T14:41:33Z
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
    sha256: 52810433e38f641e6dbe96bf471a8a1561161b36f988adc9ac0b024005186fa5
  - path: scripts/check.ts
    sha256: 265c3bdb561a903fb53a7119604f76cdf9ef0be9d7932077d1e5ff8ec785d392
  - path: scripts/git-gate.ts
    sha256: d319d4731259e12a306add4853a84c0e4f5691b4bcd56d8e0ba5386010adde12
  - path: docs/development.md
    sha256: 2aa7be5a04227dc49ec618c114bcf16abad2d90d579abc38ddd5db28e5b85237
  - path: scripts/cli-smoke.ts
    sha256: 0961ba43ea14db0593ce2741344a933ee061884f7b1d17d27b542d30fdcb88d3
  - path: tests/unit/email-tasks.test.ts
    sha256: 1ce6e201115e743514b2aa73ed14b4eaa5970947275ba51c0cc66a02ab2e1daa
  - path: tests/integration/email-tasks.test.ts
    sha256: 8e1ab858b0f01dfe160fcd6d9663df8f1a355ea44a1d2015761be3f6f3b6c9ff
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
