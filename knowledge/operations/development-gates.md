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
  at: 2026-10-25T21:00:15Z
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
    sha256: 1478d49d072015f571ea9a146ce62f5e020c30f3f547b48f40169318af39524f
  - path: scripts/cli-smoke.ts
    sha256: fbb9104380a5cc53a3d3d161777f2aa61be56c3db5df28a5f10e039037e9d3f4
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
    sha256: 86a5bd6f2c7264825ec3e9b7786371a9bda360baec0925b729509558d144c777
  - path: tests/adapters/drive-brief.test.ts
    sha256: 237288c05bf0e8138f88e7819a0f58fac03ac0945eccfbe8aa0929abe93de7d8
  - path: tests/integration/email-brief.test.ts
    sha256: 28cb97e6e507e2d572a243a705a2bf92fc2d1d720787ca06d5f09a503470734b
  - path: tests/unit/todoist-brief.test.ts
    sha256: 0fc3a577b5fc653deeb775573efda07b99c72fcf590ab006718fa4cc387b517c
  - path: tests/adapters/todoist-brief.test.ts
    sha256: 5d549dad277889e55be04a102eafb802191512ff3a4c6694f41484f8a59e89be
  - path: tests/unit/retro-review.test.ts
    sha256: 4440613731c443784f92ed29d569af7eb74207efbaa83ada6ecb99c55021fadf
  - path: tests/adapters/todoist-retro.test.ts
    sha256: cf0159e31f571bf09e0f1af893787af53926f8309e254b74dd73f784ead06225
  - path: AGENTS.md
    sha256: 814ef8b121d6c5b51a98d949561d8e50a682f42caccb9f5524d06c1cb355cf00
  - path: tests/unit/scheduled-email-brief.test.ts
    sha256: 2003a6d13f08af3ee07d194863a69435d1dd4d260c7cbf503608e2809188c5df
  - path: tests/adapters/gmail.test.ts
    sha256: 451a0241d05e52ad39055b9d01bf38fb8fbb52db7629099132215c6179ee4c03
  - path: tests/unit/automatic-capture.test.ts
    sha256: e8265e8517cf50fa6cbb70713387f3eae305964306ce0e1c6699979ff24477d1
  - path: tests/adapters/automatic-capture.test.ts
    sha256: 664d8747eceb2401e16411506c251bec242809a700c2b88f24f727ee5e6a8da2
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

Todoist-aware brief tests use synthetic paginated project/task responses, changed/removed task state, due fields, Retro filtering, exact-link boundaries, display limits and degraded/cancelled publication. Existing compiled CLI and disposable database regression gates remain required. Live task contents and Drive writes stay outside hooks/CI.

Retro gates add synthetic SDK completed-task/comment pagination, source-window/author/cap cases, exact typed choices, conservative completion rules, shared-budget/cancellation and bounded rendering checks. Compiled CLI checks include --retro-review. Live synthetic model evaluation and private source publication remain explicit operations outside hooks/CI.

Copilot review is a required PR workflow gate alongside CI: check summaries, inline threads and conversation comments on the current changes, and fix yellow/medium/warning and red/high/error findings. Keep at most three fix-and-review loops per PR, recorded with Copilot-Fix-Loop commit trailers. If findings remain after the third loop, stop patching and present a root-cause/design rethink before further work. Initial reviews and documentation-only pushes do not add fix loops; pending or absent review is not clean acceptance. See docs/development.md and AGENTS.md.

Capture gates add synthetic strict-choice, budget, matching, evidence/inventory-change, uncertain-write and annotation checks. Disposable PostgreSQL verifies current recent selection, durable non-owned mappings, terminal outcome reuse, shared writer overlap and the rolling three-intent cap. They never perform live Todoist writes. The separate two-request live shadow is aggregate evidence, not a quality benchmark or production activation.

Idle-capture regressions also verify zero inventory/inference calls for empty or locally ineligible batches, local skip/review persistence despite Todoist unavailability, one shared initial inventory for eligible records, and a fresh inventory read before creation.
