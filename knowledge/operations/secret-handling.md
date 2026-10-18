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
  at: 2026-10-11T21:30:08.389Z
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
---

# Configuration and private-data boundaries

Ignored `.env` holds independent worker credentials. `DB_URL` is authoritative whenever defined; invalid values fail validation rather than falling back silently. Otherwise require the individual host/port/name/user/password fields. Provider credentials are separate from database configuration.

Diagnostics identify fields and fixed failure categories, not secret values or raw provider exceptions. Structured logging uses controlled dimensions and redaction. Do not put credentials, real mail bodies, refresh tokens, API responses or personal feedback in OKF concepts or committed evaluation fixtures.

The manual [Gmail preview](/architecture/gmail-evidence.md) prints only fixed status/reason counts and window bounds. Bodies, addresses, subjects, source IDs and fingerprints stay in memory; its runbook records sanitized live totals only. OKF is curated public-safe engineering knowledge. Its metadata is advisory and does not establish an authorization boundary. The local viewer never reads `.env`, serves repository paths or loads external images.

See [Google grants](/providers/google-credentials.md), [test isolation](test-isolation.md), and [OKF maintenance](okf-maintenance.md).
