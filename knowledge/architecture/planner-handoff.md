---
type: Contract
title: Drive snapshot and planner freshness
description: Publish worker-owned context with honest source freshness for real
  scheduled planners.
tags:
  - architecture
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-11T02:21:58Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: planned
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/specs/brief-handoff/spec.md
    sha256: 6295d7a2e38f5233f274b976d54399a7176e35efb594338e1b1be5973a1fb778
  - path: docs/product-requirements.md
    sha256: 8aee3e08be20666e36dffa7a46b8a80acd682b76f6413ececc431fd63f9c46e7
---

# Drive snapshot and planner freshness

## Artifact ownership

Publish the dedicated `jev-current.md` snapshot using a stable configured Drive file ID. The worker owns this artifact only; preserve Daily Life Plan, Daily Inbox Digest and user retrospectives. Keep source and task links so the planner can inspect evidence.

## Freshness

Include a generation identifier, publication time, last successful Gmail and Todoist synchronization times, pending failures and gaps. Freshness measures successful source observation, not just a recent build timestamp. If publication fails, the old artifact must retain its old freshness metadata.

A configurable 15-minute stale-input cutoff is a proposed default. The planner should retrieve the actual latest generation and current Todoist inventory in its real scheduled-task context. Stale or unavailable input requires an explicit fallback and gap report, rather than presenting yesterday's context as current.

Calendar blocks help the planner choose actions; they do not authorize Calendar writes or prove completion. Verify actual planner retrieval before changing scheduled prompts. See [personal brief loop](/product/personal-brief-loop.md), [uncertainty](uncertainty.md), and [Retro](retro-feedback.md).
