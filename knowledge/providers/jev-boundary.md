---
type: Contract
title: Jev adapter and judgment boundary
description: Bounded typed triage is implemented; evaluated matching, routing
  and capture remain planned.
tags:
  - providers
  - jev
  - mixed
status: draft
generated:
  by: codex/gpt-6
  at: 2026-10-25T18:50:05Z
stale_after: 2026-11-10T02:21:58Z
x_jev_delivery: mixed
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/src/adapters/jev.ts
    title: src/adapters/jev.ts
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
x_jev_sources:
  - path: src/adapters/jev.ts
    sha256: 9018768dc73a9852ea92a2c208b29441bfb2573a7b34d24290a09b6d6573642b
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
  - path: src/adapters/jev-triage.ts
    sha256: b88247e2ac8d915a1f365b46a7d3fe04fdd1207eec715d9aaac1eca7f5ce0646
  - path: src/domain/mail-triage.ts
    sha256: 5476e6c425cd5c30430d78459f5faedb11b6d52fc297c64a624fd9674768c7db
  - path: src/adapters/jev-email-tasks.ts
    sha256: b95e50552261fb4665a4854d3758b32aa4760e10f73df01190f05bc6b19dc43e
  - path: docs/email-task-pilot.md
    sha256: 8089ef62743ecc604a5bd820424ccb1fba9fce65230f5e5e3b4b45ad6b67749b
  - path: src/application/email-brief.ts
    sha256: 1b5ac51f57c8411e7bf5d48e2249ccf039214ffd856e99be1724d70e6cf98963
  - path: docs/email-brief.md
    sha256: 10d6613da7824e6d996e8aee904c0cf66eab2f664e49a7cdb491aea4924a1089
  - path: docs/email-brief-evidence.md
    sha256: bf7d371c90e3028e05719dd8f793e3522b48b5c0bb3d59f10f6b391a6abcce94
  - path: src/adapters/jev-retro.ts
    sha256: 2df78af6819a00281c02310b33b5f14dfa42d2a1b20b649573d998b4769713cf
  - path: src/domain/retro-review.ts
    sha256: 750a144c5d8cf6df1e99d7b7115c6afa1b394e11323c49c354c3700eb4477148
  - path: src/adapters/jev-capture.ts
    sha256: e2753f6ca0a71258c4b0cce39826dea29704d081d2d58fce5165aee8f3908ed9
  - path: src/domain/automatic-capture.ts
    sha256: cdb0cc362537a78a7921c615d4bf10238bd512b70a818e7c110f63d9f74f5163
  - path: docs/automatic-capture-evidence.md
    sha256: 17c810b586d5b1769b6864d879f2185bb5ce2aa1db12f6712a3fc310cd69be3e
---

# Jev adapter and judgment boundary

The current TypeSafe AI SDK adapter checks model availability with a bounded read-only call, retries disabled and SDK logging disabled. `JEV_API_KEY` belongs only in local/runtime secret configuration.

The explicit `mail:classify` preview asks independent kind, attention and lifecycle choices on complete stored evidence. Zod validates exact keys, enum choices, numeric probabilities/confidence, usage and returned model identity. Policy `mail-triage/v1` uses live-confirmed numeric model revision `jev-1.13.0`; mutable aliases are rejected. The initial setting is uncalibrated. Preview leaves storage/jobs/tasks unchanged. Matching and routing remain planned. No model output can extend project IDs, bypass manual overrides or request arbitrary tool execution.

Only necessary subject/body/timestamp/direction state is sent, capped at 32 KiB without truncation; address lists, dedicated source IDs and attachment contents are omitted. Body text can contain private information. Calls have five-second timeouts, disabled retries/logging and shared cancellation/deadline bounds. Use [evaluation](/operations/classification-evaluation.md) to choose later thresholds, and follow [classification policy](/architecture/classification-policy.md).

The v2 reviewed-task adapter asks eligibility separately from sentence/project selection in one request and checks the complete serialized request against the 32 KiB bound. Literal criteria quote source/project data; finite validated output cannot grant new destinations or actions. A tiny six-case live synthetic check and an explicitly approved ten-conversation fresh preview are development/pilot evidence, not a classifier-accuracy benchmark or permission for unattended capture.

The manual [Drive brief](/architecture/planner-handoff.md) now reuses these triage choices and persists validated decisions with exact input identity. A separate new-attempt cap permits cached-only publication; unchanged replay makes no Jev call. Owner exclusions run first. This saves email triage only, without task effects, correction handling, calibration or unattended inference. Provider errors and invalid results remain retryable and visible; saved unknowns remain review cases.

Explicit manual Retro review adds finite task-kind, task/relation and source-excerpt choices on pinned jev-1.13.0. It sends selected Retro text and current candidate task titles, omitting dedicated IDs, task descriptions and attachments. Full serialized requests are limited to 32 KiB, with strict returned model/answer/criterion/probability/usage validation. Attempts share the publisher's cap/deadline; retries remain disabled. Interpretations are ephemeral, and repeated explicit review is charged again. Conservative uncalibrated 0.85 gating yields human-review suggestions only. See [Retro](/architecture/retro-feedback.md).

Automatic pending classification now runs under the persistent lifetime allowance. The opt-in capture adapter reuses the pinned task question, adds one finite existing-task choice, and sends only email evidence, allowed project context and up to 100 task-title/completed hints under the complete 32 KiB request bound. Provider IDs and task descriptions stay local. Strict answer validation and provisional 0.95 gating permit review or bounded creation; the shared allowance is reserved before inference and ambiguous usage remains charged. A two-request read-only shadow check returned none/review and made zero Todoist writes. This is contract evidence, not a quality benchmark. See docs/automatic-capture-evidence.md.

Capture request preparation builds and bounds the complete SDK request before the application reserves allowance. Only the returned invocation performs hosted inference. Deterministic preparation failures are visible review cases without spending or hourly retries.
