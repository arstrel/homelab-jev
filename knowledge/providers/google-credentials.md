---
type: Runbook
title: Google credentials and repeat grants
description: Understand the worker OAuth grant, scopes and safe reauthorization path.
tags:
  - providers
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/connections.md
    title: docs/connections.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/google-authorize.ts
    title: scripts/google-authorize.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/scripts/google-oauth.ts
    title: scripts/google-oauth.ts
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/google.ts
    title: src/adapters/google.ts
x_jev_sources:
  - path: docs/connections.md
    sha256: f887016114368f775e58c0c7945b8117f9ee016483a4e730842c8a06bdb196c8
  - path: scripts/google-authorize.ts
    sha256: b94b18185d9404a666ab6ba7fe9cd651b59ab06168cd6770deaa86c8bf3c8369
  - path: scripts/google-oauth.ts
    sha256: ec3f707bb0347826ade626decf09022bb18b4d440d1aa7fe4082306cc2d526e1
  - path: src/adapters/google.ts
    sha256: 229c423c7ce3a0d68dd1ab9422eaf9af474f04df0563367f3825b054d3b26beb
---

# Google credentials and repeat grants

The worker requires its own `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`. Existing ChatGPT Google connections and adding a consent-screen test user do not create a worker grant. A refresh token is still required in Testing mode.

The approved desktop client uses a temporary loopback callback, state and PKCE. `npm run google:authorize` requests offline access and explicit consent for Gmail readonly and Drive `drive.file`, then privately saves a scoped refresh token to the ignored `.env`. It preserves unrelated configuration and refuses conflicting edits and symlinks. The helper is worth retaining for expired/revoked grants and replacement accounts.

Testing-mode grants involving Gmail can expire after seven days. Production publication has branding requirements; use the connection runbook for current Google-console steps and policies. `drive.file` grants access to app-authorized files, not unrestricted access to arbitrary Drive artifacts. Demonstrate access to the dedicated handoff file explicitly.

`npm run connections` makes bounded read-only Gmail profile and Drive listing checks. Passing these does not prove a specific artifact can be read or published. See [provider checks](connection-checks.md) and [secret handling](/operations/secret-handling.md).
