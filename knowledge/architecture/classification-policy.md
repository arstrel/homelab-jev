---
type: Policy
title: Typed classification and evidence policy
description: Ask Jev narrow questions and let deterministic code enforce effects.
tags:
  - architecture
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T20:32:10Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/docs/product-requirements.md
    title: docs/product-requirements.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
x_jev_sources:
  - path: docs/product-requirements.md
    sha256: a5069d9ab2ebc61ee4aacdb855e90be35208537a22b8e5dd844d94a762f00d15
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
  - path: src/domain/mail-triage.ts
    sha256: 5476e6c425cd5c30430d78459f5faedb11b6d52fc297c64a624fd9674768c7db
  - path: src/application/triage-mail.ts
    sha256: 0b15b2f4910ac677fb09a8a7c3c19c081c0f13e680d32283143847dbebb7f2b9
  - path: docs/mail-triage.md
    sha256: 2a9a384419b55a6f6c1c71511759ea7e1ef960e2ef01cf57ca025155ca396057
  - path: src/domain/email-task.ts
    sha256: 0d3f27d05e8b330b028e79fa526f20b9c5b1370df2098cc8478b4b7ad95bcdc2
  - path: src/application/email-tasks.ts
    sha256: 4e482cd3b344f06d4eb32aa5314be0efc091b0557f39b94e95a08e4e58afa3fd
  - path: src/adapters/jev-email-tasks.ts
    sha256: b95e50552261fb4665a4854d3758b32aa4760e10f73df01190f05bc6b19dc43e
  - path: docs/email-tasks.md
    sha256: 3df102bf99fba1b700d31d9635ce5d3c77cb8e3ea4b1aaa923350b24271019a3
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: src/domain/email-brief.ts
    sha256: 79fda7c5e18a320cf9826caa82ae869a8bdce327b19a48e676203c46695667c5
  - path: src/application/email-brief.ts
    sha256: 1b5ac51f57c8411e7bf5d48e2249ccf039214ffd856e99be1724d70e6cf98963
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/application/review-retro.ts
    sha256: 18a777d202fc3f64612316601ad6b77df0767796c5626e36851b94524bfa4976
  - path: src/application/classify-pending-mail.ts
    sha256: 6724c301287e07d370fc003942d529ab720b4a6774bac54cbac76f92eea02d71
  - path: src/adapters/postgres/email-brief.ts
    sha256: 480be952ed744105755a955e58e636d77d0269bb54d198f5a8a2b99764009e19
  - path: docs/automatic-mail-classification.md
    sha256: 6ed7e95d4dfe5a520a837ad8c62aac969e6ff7674e8ed071a4de86ffee2de9ce
  - path: src/cli-email-brief.ts
    sha256: ebfa4658d425f12aeaeef605cadc7b08e4cd6712bff06ddcd654c2c6128ec38d
  - path: tests/unit/scheduled-email-brief.test.ts
    sha256: 2003a6d13f08af3ee07d194863a69435d1dd4d260c7cbf503608e2809188c5df
  - path: src/domain/automatic-capture.ts
    sha256: cdb0cc362537a78a7921c615d4bf10238bd512b70a818e7c110f63d9f74f5163
  - path: src/adapters/jev-capture.ts
    sha256: e2753f6ca0a71258c4b0cce39826dea29704d081d2d58fce5165aee8f3908ed9
  - path: src/application/capture-mail.ts
    sha256: 1ad2014e481f2692dd9ad7c4c045f92b8074d3f150d9f2ed41b0f0b7694cceff
  - path: docs/automatic-todoist-capture.md
    sha256: 4500e3552d9904b415ce7d8de25e2d8c4cb15c3920091013d98b01d8f7c2a4fe
---

# Typed classification and evidence policy

Jev supplies bounded judgments; deterministic code owns identity, allowed destinations, dates/arithmetic, confidence policy, source-supported titles, deduplication and writes. Email and project text are untrusted data and cannot introduce a destination or executable action.

The read-only `mail:classify` preview obtains kind/attention/lifecycle choices with unknown values from exact stored evidence. The publisher saves validated judgments and owner exclusions by evidence/directions/model/policy identity, atomically completing their jobs. Unchanged inputs reuse saved decisions. Owner exclusions cover routine GitHub PR notifications and Google Cloud terms notices, not security/CI mail or direct requests.

Active scheduled `--classify-pending --max-new 0` processes up to ten due current jobs independently of the newest-email display sample. Storage readiness is checked while holding ownership. Failures defer one hour; a durable $2 lifetime allowance reserves maximum request cost before dispatch, settles valid usage once and retains ambiguous charges. This path alone does not create tasks.

The manual reviewed task flow obtains separate eligibility, source-title and project choices, then requires explicit approval. Automatic `--capture-tasks` adds bounded existing-task matching over up to 100 open/recent-completed candidates. Mapping and exact Gmail references precede semantic choices. Unknown/contradictory/Inbox choices and required confidence below 0.95 remain review-only; that cutoff is provisional, not calibration.

Complete request validation precedes capture spending. Oversized deterministic inputs become review-only without a paid dispatch; ambiguous dispatched calls retain their charge. Current evidence and live inventory are checked before admission. A non-cancellation verification-read failure defers one hour and stops before writing. Existing task fields remain untouched and durable links suppress mapped replay.

Parent 3.1/3.3 are implemented and synthetically tested. Correction recording, actionable review resolution, representative held-out evaluation, multiple obligations per thread and general lifecycle reconciliation remain open. The active pilot is not completion of the original evaluation requirement. No useful real capture has been accepted in its activation evidence.

Optional manual [Retro review](retro-feedback.md) uses separate finite task-kind/relation/excerpt choices, provisional 0.85 review-only gating and strict preservation of reusable/recurring work. It never authorizes completion. See [Jev adapter](/providers/jev-boundary.md), [evaluation](/operations/classification-evaluation.md), [delivery](/product/delivery-boundary.md) and [uncertainty](uncertainty.md).
