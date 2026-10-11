---
type: Rule
title: Uncertainty remains visible
description: Prefer explicit review states to invented precision or silent loss.
tags:
  - architecture
  - jev
  - planned
status: draft
generated:
  by: codex/gpt-6
  at: "2026-10-11T02:21:58Z"
stale_after: "2026-11-10T02:21:58Z"
x_jev_delivery: planned
sources:
  - id: s1
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
  - id: s2
    resource: https://github.com/arstrel/homelab-jev/blob/e0a98c6ee1ea4179544967a51dbd42724a8a956f/openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    title: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
x_jev_sources:
  - path: openspec/changes/add-personal-brief-preprocessing/specs/email-classification/spec.md
    sha256: 56bc45f00cc0e95c1eafd63afef8a262ce537c3e012fec5de66a374eb2e04e9a
  - path: openspec/changes/add-personal-brief-preprocessing/specs/todoist-obligations/spec.md
    sha256: d6bef852b7c90292aacb8707eb6b911c1203f710a127aae5d5fbe2c356532373
---

# Uncertainty remains visible

Unknown is a valid result. Uncertain classification, matching, routing or completion must retain source evidence and a review reason. A confident action with an uncertain destination belongs in the defined Inbox review path. Noise/FYI does not create a task solely to record uncertainty.

Do not invent deadlines, merge unrelated obligations, auto-complete from model inference, or drop a genuine obligation because a provider failed. Retryable operational failures remain pending; semantic uncertainty remains reviewable.

The Drive snapshot and daily brief should distinguish actions, waiting items, review candidates and source freshness gaps. Review corrections can improve later evaluation but do not authorize changing all similar user tasks.

See [classification](classification-policy.md), [manual edits](manual-edits.md), and [planner handoff](planner-handoff.md).
