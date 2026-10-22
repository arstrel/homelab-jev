# Design

## Context

See [proposal](proposal.md). Existing triage provides finite validated kind/attention/lifecycle judgments, pinned model and a 32 KiB state bound. Existing storage has exact evidence/jobs, classification JSON and unique per-destination write intents. Drive OAuth already includes drive.file. The native collector runs a reviewed release independently of this checkout.

## Goals / Non-Goals

**Goals:** one useful artifact with reusable judgments and honest coverage; minimal reuse of current ports/adapters/storage.

**Non-Goals:** unattended inference, general task reconciliation, generated summaries, planner-prompt changes, new infrastructure or replacing the active collector release.

## Decisions

- Add `brief:publish --max-conversations 10 --days 7 --max-new 10`; sample and attempt caps range up to twenty, with zero new calls allowed. Order current complete versions by latest message timestamp, independent of retrieval time. Show the full eligible stored count separately from the selected sample. Exclude future timestamps from the window.
- A dedicated PostgreSQL session lock serializes this command without blocking collection. Remote calls happen outside transactions. Reuse existing classification JSON, storing the brief policy, a hash of exact evidence/model/directions and a validated decision. Atomically insert a successful decision and complete its bound job. No migration is needed; serialize cooperating publishers and retain immutable result history. Do not consume failed jobs or substitute newer evidence.
- Run the existing narrow GitHub/terms owner rules first. Save those as deterministic exclusions, without fabricated confidence or token usage. Reuse existing Jev triage otherwise. Keep unknowns and operational failures distinct; classify waiting before attention buckets, and resolution suggestions as review cases. All judgments remain uncalibrated.
- A private Markdown template contains source subjects, timestamps, Gmail links, per-judgment choices/confidence, generation, sample/window bounds, source timestamps, pending counts and fixed failures. Escape source text into one-line plain labels. Include no email bodies or sender addresses. Todoist/Retro context is explicitly unavailable in this slice.
- Use one existing Drive write intent keyed to the primary brief. Reserve a Drive-generated file ID before creation and retain it forever. Store prior successful generation/time alongside the ID; failed publication leaves it unchanged and the intent ambiguous. Resolve this same ID on the next explicit run. Never search by filename or recreate a confirmed/deleted file automatically.
- Create/update `text/markdown` named jev-current.md with an app-private ownership/generation marker. No sharing or folder changes. Verify metadata and exact uploaded content before settling the intent. Use Google SDK timeouts, disabled retries, cancellation and a bounded command budget. A lost response is recoverable by an explicit run on the same ID. See [Google's pre-generated ID contract](https://developers.google.com/workspace/drive/api/guides/create-file#generate-ids-to-use-with-your-files).
- Existing DB-only diagnostics capture source gaps without altering freshness. Overlap skips before any providers. Logs contain counts, fixed reasons and the confirmed Drive URL; subjects and Gmail links appear only in the private artifact.
- Live verification uses at most twenty inference attempts total in this implementation session, then cached-only replay. The provider lists $0.042 per million input tokens, free output and a 64k default request ceiling for pinned Jev 1.13; even twenty accepted maximum-size calls are below $0.06 at that rate, within the user's remaining $2 allowance. Report returned usage as an estimate, not a billing receipt. [Official model/pricing reference](https://docs.typesafe.ai/models), checked October 21, 2026.

## Risks / Trade-offs

- A bounded newest sample omits older obligations → display sample/window coverage; do not present it as the complete task inventory.
- Partial collection and model errors → preserve gaps and uncertainty; a new build timestamp is not source freshness.
- Remote write uncertainty → reserve identity first and verify before success; keep prior successful metadata.
- The snapshot can contain private subjects → create in the user's Drive without sharing, keep fixtures synthetic and local previews ignored/private.

## Migration Plan

No schema changes or worker redeployment. Verify offline and disposable database gates, run a bounded authorized publication, fetch the exact Drive file back, repeat cached-only against the same ID and record sanitized evidence. Publish through a PR. Parent automatic capture, full handoff, calibration and recurring-classification acceptance remain open.
