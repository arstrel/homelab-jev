---
type: Contract
title: Bounded provider connection checks
description: A successful check proves basic authentication, not processing or
  all resource permissions.
tags:
  - providers
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
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/connections.ts
    title: src/adapters/connections.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/jev.ts
    title: src/adapters/jev.ts
  - id: s3
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/gmail.ts
    title: src/adapters/gmail.ts
  - id: s4
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/drive.ts
    title: src/adapters/drive.ts
  - id: s5
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/todoist.ts
    title: src/adapters/todoist.ts
x_jev_sources:
  - path: src/adapters/connections.ts
    sha256: c2c149f9958ef8d83f324ced2e7cf58e7fe9c88fad7e0be5cee1937b848c1b4b
  - path: src/adapters/jev.ts
    sha256: 9018768dc73a9852ea92a2c208b29441bfb2573a7b34d24290a09b6d6573642b
  - path: src/adapters/gmail.ts
    sha256: 87224a07d772828108d8ce67b295a22a1656802327116f63a750c280bafca0ae
  - path: src/adapters/drive.ts
    sha256: d76eb0f4a07f5d9a3da155eea00de0c3792b5023a6f167486ab90b68ba1b6c02
  - path: src/adapters/todoist.ts
    sha256: 893a433a2878b505872f14719cced7bfede0521b4c505e203de0b9e1fda749a3
---

# Bounded provider connection checks

The connection command reads Jev model availability, one page of Todoist projects, a Gmail profile and a minimal Drive file listing. Per-call deadlines and a command deadline prevent hanging. Results are discarded; diagnostic messages are fixed and avoid arbitrary provider errors or secrets.

A passing check proves those bounded reads succeeded with current credentials. It does not prove Gmail history recovery, mailbox-body permissions beyond the requested scope, Todoist writes, access to a specific Drive file, worker deployment or scheduled-planner retrieval.

The Gmail adapter now also exposes a separate bounded [manual evidence reader](/architecture/gmail-evidence.md); connection checks still do not retrieve mail bodies or run processing. SDK adapters isolate provider contracts and do not turn a connection check into a background processing run. See [Google grants](google-credentials.md), [Todoist identity](todoist-boundary.md), [Jev judgments](jev-boundary.md), and [delivery boundary](/product/delivery-boundary.md).

The Gmail adapter also supports profile/history reads for [manual sync](/architecture/mail-sync.md), with history-only expiry mapping. The connection-check command still performs only its bounded authentication/resource checks and cannot establish synchronization recovery or live freshness.
