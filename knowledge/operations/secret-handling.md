---
type: Invariant
title: Configuration and private-data boundaries
description: Keep credentials and private message data outside logs, tests and
  knowledge documents.
tags:
  - operations
  - jev
  - implemented
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-22T04:37:01.245Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: implemented
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/config.ts
    title: src/config.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/observability/logger.ts
    title: src/observability/logger.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/connections.md
    title: docs/connections.md
x_jev_sources:
  - path: src/config.ts
    sha256: e2721f7246de11c69a3b4ddad09ede1cb927545ee3b705f020924f546401d5b6
  - path: src/observability/logger.ts
    sha256: ce8664bd4e4b0893ffef313d7e0857f624eba0ced4ae16ff1adc6f4e4e22d0ed
  - path: docs/connections.md
    sha256: f887016114368f775e58c0c7945b8117f9ee016483a4e730842c8a06bdb196c8
  - path: docs/mail-ingestion.md
    sha256: 5fb67c4759c404bc599c53b606fa5c94bec7c2cb20e0e06ffb1719b8898defb6
  - path: src/cli-email-tasks.ts
    sha256: 03d03bcd3477bab151136626c8801c25267d15727583299a547fe616242f33e1
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: src/cli-email-brief.ts
    sha256: c7374612107f1c2e2e513dc4243fa1730b07bb8b5ef297967d017027b869ffef
  - path: src/application/email-brief.ts
    sha256: bde5b54bfffba9163f93cf1eefeb41f44bfe4b23f08d589230118c148c6ccb07
  - path: src/adapters/todoist-brief.ts
    sha256: f60bf9703a34d30580fce1c1569a705e0cd98b5a3c12d8146666c81f4586412e
  - path: src/domain/todoist-brief.ts
    sha256: 4516ae5f375c3c5211c0b57a948391ad34bb40127aaa8744a1f585753fdb12b0
  - path: docs/email-brief.md
    sha256: c40b3cd8e7bb03361dfd5c35205ca8d51671d077b86dad2699a715b761725354
---

# Configuration and private-data boundaries

Ignored `.env` holds independent worker credentials. `DB_URL` is authoritative whenever defined; invalid values fail validation rather than falling back silently. Otherwise require the individual host/port/name/user/password fields. Provider credentials are separate from database configuration.

Diagnostics identify fields and fixed failure categories, not secret values or raw provider exceptions. Structured logging uses controlled dimensions and redaction. Do not put credentials, real mail bodies, refresh tokens, API responses or personal feedback in OKF concepts or committed evaluation fixtures.

The manual [Gmail preview](/architecture/gmail-evidence.md) prints only fixed status/reason counts and window bounds. Bodies, addresses, subjects, source IDs and fingerprints stay in memory; its runbook records sanitized live totals only. OKF is curated public-safe engineering knowledge. Its metadata is advisory and does not establish an authorization boundary. The local viewer never reads `.env`, serves repository paths or loads external images.

Explicit [manual ingestion](/architecture/mail-ingestion.md) stores private message text/headers in PostgreSQL, requiring private database and backup access. Terminal reports remain sanitized. No automatic cleanup exists; retain job-referenced evidence until a reviewed retention mechanism is added. No operational ingestion is performed by tests or CI.

DB-only [observation](mail-observation.md) fetches fixed metadata and aggregates rather than message payloads/identifiers. Unknown stored failure text becomes a fixed category in SQL and report validation strips unexpected fields. Committed pilot evidence contains reviewed aggregate results only; intermediate captures and credentials stay outside tracked artifacts.

See [Google grants](/providers/google-credentials.md), [test isolation](test-isolation.md), and [OKF maintenance](okf-maintenance.md).

The explicit [reviewed task flow](/product/todoist-projects.md) deliberately displays proposed private task titles and Gmail links for approval, and writes mode-600 files under ignored `.cache/mail-tasks/`. Keep those artifacts and terminal output outside Git/shared logs. Preview sends bounded mail/project context to hosted Jev only when invoked; apply uses the local review without another model call. Tests use synthetic data and never perform live capture.

The manual [Drive brief](/architecture/planner-handoff.md) contains private email subjects and copied Todoist task titles/due values in one app-owned private file. Todoist descriptions are used locally only for exact Gmail links; no task context is sent to Jev or stored as a database inventory. Console output contains fixed states/counts and the confirmed file URL, without task/project names or descriptions. Keep live read-back captures private and ignored; committed evidence is aggregate only.
