# Design

## Context

See proposal.md. The SDK 0.6.0 exposes `systemOne`/`choice`, but its TypeScript return type does not validate the network response. The operational model listing exposes aliases; synthetic calls resolved `jev-latest` to `jev-1.13.0` and confirmed that requesting `jev-1.13.0` directly is supported and returns that revision. Existing immutable evidence and pending jobs are ready for read-only consumption; lifecycle decisions, matching/routing and evaluated capture policy are not yet implemented.

## Goals / Non-Goals

Deliver an executable, inspectable triage preview using complete stored evidence. Preserve the collection/reconciliation stage boundary. Persistence/corrections, task matching, routing, numeric/date inference, calibrated thresholds and job consumption remain later slices; parent 3.1 stays open.

## Decisions

- Add `mail:classify --max-jobs 5 --model jev-1.13.0` (1–20 jobs; the live-confirmed explicit revision). Reject mutable aliases and unsupported revisions. Read pending rows in availability/ID order using an SDK-free port. Join the exact fingerprint-bound evidence, validate with the existing stored-evidence parser and close the read-only transaction before provider calls. Legacy unbound jobs remain explicit gaps.
- Reuse the existing SDK factory and Zod. Send subjects, bodies and direction hints from one complete thread, with local message references rather than source IDs. Direction comes from the latest observation matched to exact evidence message IDs, falling back to unknown. A 32 KiB serialized state cap rejects oversized evidence; no truncation. No live Todoist context is needed for triage.
- Ask three independent choice questions: kind (personal/notification/newsletter/unknown), attention (action/fyi/noise/unknown), lifecycle evidence (request/waiting/resolution-suggested/none/unknown). The lifecycle result is evidence only, never task completion. Strict response schemas accept only the supplied keys, finite probabilities/confidence in [0,1], expected model identity and nonnegative safe token counts. No arbitrary prose enters reports.
- Preview reports validated judgments by sample ordinal, aggregate usage, failures and elapsed time. Policy `mail-triage/v1`, requested/returned revision and `uncalibrated` are explicit. Calls are sequential, 5-second per-request timeout and a 120-second command deadline, zero retries, cancellable and SDK logging off. Repeated previews are intentionally chargeable; no job state changes or deduplication claims.

## Risks / Trade-offs

- Semantic prompt injection or misclassification remains possible → finite choices, no effectful capability, synthetic hostile-input contracts and later representative evaluation.
- Large conversations are skipped → report a visible input-too-large result while preserving jobs and full evidence.
- Provider aliases can change → request the live-confirmed numeric revision and reject mismatched returned identity; this is an initial model setting, not an evaluated quality guarantee.
- Terminal probabilities reveal classifications → output excludes identifiers and source text; do not commit real per-sample results.

## Migration Plan

No migrations. Build and invoke explicitly; no recurring execution. Revert code to remove preview while retaining collected data.
