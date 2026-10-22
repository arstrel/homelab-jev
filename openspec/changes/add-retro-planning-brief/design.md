# Design

## Context

See [proposal](proposal.md). Current brief publication has a shared provider deadline, new-inference cap, private Drive destination and bounded Todoist task reader. Live metadata discovery found no open Retro tasks and twelve recently completed entries; completed-history reads are essential. The pinned SDK exposes completed tasks and task comments.

## Goals / Non-Goals

**Goals:** recent source feedback plus inspectable task-kind and match review in one private artifact.

**Non-Goals:** automatic completion, generated next-step prose, a general matching engine, new storage or scheduling.

## Decisions

- Reuse active Retro identity discovery from the Todoist reader; require a unique active Retro project unless its ID is configured. Read at most two 100-item open pages, two 100-item completed pages (seven-day window) and comments for at most ten distinct recently updated/completed/created source tasks, two pages of fifty comments each. Deduplicate records without conflating recurring completion occurrences; filter deleted/foreign-project results and future/out-of-window timestamps. Expose task/comment scan caps, undated records, skipped attachments and read failures. New comments on older scanned tasks can be included independently of task dates. No Drive plans are treated as feedback.
- Produce up to ten newest feedback records, retaining bounded title/description or comment text and source links. Keep original source text for request-size validation rather than silently truncating model evidence. The private source section uses labelled excerpts and a byte bound. Older unscanned task comments remain a disclosed gap. Read failures discard the partial Retro read; original tasks/comments stay untouched.
- Add `--retro-review` (default off). Share the existing `--max-new` cap across email and Retro inference, counting failed attempts. Batch task-kind choices for at most fifty displayed current tasks in groups of ten; then judge at most ten feedback records with separate task/relation/evidence choices. Use source-backed finite excerpts, explicit none/unknown choices, pinned `jev-1.13.0`, exact answer/probability/model/usage validation and a 32 KiB full-request bound. No long-context mode or automatic retries. The overall provider budget remains two minutes and grows only its request-count allowance to cover the new bounded reads.
- Apply a conservative initial 0.85 review threshold to all required choices, with unknowns and conflicting answers remaining uncertain. This is a provisional review threshold, not calibrated accuracy. Finite-task completion can produce only a possible-completion review; reusable/recurring work remains available, broad goals remain open, and ambiguous kinds cannot produce completion candidates. Source text and quoted task choices are data, never authority. Model output cannot invent prose, destinations, dates or actions.
- Interpretation is manual and not cached in this slice; explicit repeated review can incur new bounded charges. Default context publication does not reuse earlier interpretation as current. Keep email cache identity unchanged, use existing ports/SDKs and avoid a new task store/table. Render new kind/review sections and source gaps, and report only aggregate state/usage to the console.
- Evaluate deterministic source/validation gates with synthetic fixtures and a small live synthetic Jev set, then publish a bounded real Retro sample within the owner's remaining $2 allowance. At most 150 new inference attempts across this implementation session (including evaluation), default-context replay with zero additional Retro calls, and returned usage recorded as estimated cost. At the [current pinned-model price](https://docs.typesafe.ai/models), 150 maximum default 64k requests are below $0.41. Live labels remain uncalibrated pilot evidence.

## Risks / Trade-offs

- Dated source changes are not necessarily the day an activity happened → label timestamp basis and quote source; do not infer event dates.
- Capped history/comments/task candidates omit information → disclose coverage and uncertainty without blanket completion.
- A task-kind mistake could mislead planning → review-only effects, conservative threshold, explicit unknowns and recurring-work preservation; test broad setup, rowing, goals and conflicting evidence.

## Migration Plan

No migration, dependency or collector deployment. Run offline/database regression gates and live read-only publication/read-back against the same Drive ID; deliver a PR with sanitized evaluation/evidence. Actual scheduled-task consumption and automatic reconciliation remain separate milestones.
