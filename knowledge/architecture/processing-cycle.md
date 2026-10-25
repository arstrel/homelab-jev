---
type: Workflow
title: Five-minute processing cycle
description: A bounded native poller moves evidence through durable stages and
  publishes truthful context.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T20:58:36Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/design.md
    title: openspec/changes/add-personal-brief-preprocessing/design.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/design.md
    sha256: 98b91697539d06bf087cdef36597cf2a73dad4b69edaf7e377005215cb7334c6
  - path: openspec/changes/add-personal-brief-preprocessing/specs/worker-operations/spec.md
    sha256: cb573cbb85a6a53ad61363014df299c6f4eea8b6707a48b6aeb1d99b639e0408
  - path: deploy/README.md
    sha256: d9cff016d5cd902a8459361782f5bfd918cbc687fecccd2f82beb973a977eb95
  - path: scripts/mail-worker.ts
    sha256: 87ff1739e86a7a02fa241e6a4b5253e0547d9ad39a5513c24314454ece280a4c
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: deploy/brief-refresh.md
    sha256: 11683cc53fce5817189291ddc34e7d0c4e03f0c09d56f68ead4f5bf07486a46e
  - path: src/cli-email-brief.ts
    sha256: ebfa4658d425f12aeaeef605cadc7b08e4cd6712bff06ddcd654c2c6128ec38d
  - path: src/application/capture-mail.ts
    sha256: 1ad2014e481f2692dd9ad7c4c045f92b8074d3f150d9f2ed41b0f0b7694cceff
  - path: docs/automatic-capture-evidence.md
    sha256: 1bcd2644ec0a175fc173ab9c3fd52d1108de68ff9ab14a50e7de4913abb00c78
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# The five-minute processing cycle

Two native one-shot LaunchAgents run every five minutes on the Mac mini: a paced collector and a separate publisher. Both execute reviewed compiled releases independently of the editable checkout. No Gmail push webhook or extra task inventory is required.

The collector holds its dedicated PostgreSQL ownership session, discovers/queues Gmail changes and atomically saves complete evidence, exact-bound jobs and acknowledgement. Discovery progress and complete-evidence freshness are separate. Bounded expired-cursor recovery covers a recent window and mapped conversations; its unreplayed-history gap remains explicit.

The active publisher holds publisher ownership while classifying up to ten current due conversations under the durable lifetime allowance. Optional capture then selects up to five recent classified sources under the shared manual-writer lock, checks current projects/tasks, matches known obligations and admits at most three creation intents per rolling day. Capture loads inventory only after the first record passes local evidence/exclusion/confidence checks; idle or entirely locally ineligible batches make no capture provider calls. Eligible records share one initial inventory while semantic linking/creation still requires a fresh read. This idle-read correction awaits merged-release deployment. Existing task fields remain untouched; ambiguous writes stop blind retries.

Publication reacquires publisher ownership separately, refreshes current Todoist/Retro context and writes/readbacks the same private Drive artifact. It reuses saved email judgments; Retro inference remains explicit/manual. Capture counters describe the current invocation, and historical mappings are not live completion authority. The CLI orders these stages; it is not one atomic transaction or one continuous lock across every stage.

Dedicated locks skip overlap, remote calls stay outside SQL transactions, deadlines/cancellation bound provider work and unfinished work remains durable. October 25 activation and subsequent no-change collector reports establish scoped deployment/freshness acceptance, not perpetual availability or useful-capture accuracy.

General per-field correction tracking, review resolution, multiple obligations per thread and reply/waiting/completion lifecycle remain planned. See [release operations](/operations/native-releases.md), [classification](classification-policy.md), [write safety](remote-write-safety.md) and [delivery](/product/delivery-boundary.md).
