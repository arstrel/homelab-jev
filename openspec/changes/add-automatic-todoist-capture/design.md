## Context

The existing manual task flow already supplies source-supported titles, allowed projects, stable creation keys, durable ambiguous intents and persistent task links. PR #23 adds shared lifetime inference accounting and current classification. This pilot reuses those boundaries.

## Goals / Non-Goals

Deliver a small opt-in vertical slice: recent explicit obligations become tasks or match existing tasks without touching the user's fields. General multi-obligation reconciliation, inferred dates, waiting labels and completion writes remain separate work. The parent large evaluation/rollout checklist remains open; this guarded pilot does not claim calibrated general capture.

## Decisions

- Extend the existing five-minute publisher with `--capture-tasks`, requiring `--classify-pending`, `--max-new 0`, Todoist credentials and an explicit `JEV_CAPTURE_SINCE` timestamp. Source timestamps before that boundary are excluded, preventing historical backlog capture.
- Process at most five current complete sources with exact saved action/request classification per cycle. Require strict typed eligibility/action/project/match confidence of at least 0.95; unknowns, Inbox routing and ambiguous matches become review outcomes, not writes. The cutoff is a conservative pilot policy, not measured calibration.
- Select local work and apply evidence, owner-exclusion and saved-classification checks before loading capture's Todoist inventory. Load it once on the first locally eligible record; empty or entirely skipped/review-only batches make no capture inventory reads. Keep the separate fresh inventory read before semantic linking or creation. Publication still independently refreshes its own Todoist context.
- Read current active projects, all bounded open tasks and completed tasks from the last 30 days; exclude Retro and fail closed on incomplete/oversized inventory. Match durable links and exact Gmail references before a single bounded Jev eligibility/title/project/existing-task request. At most 100 task titles enter model context. Never let model-provided IDs or free-form text become destinations.
- Reuse the existing source-scoped key (one task per conversation in this slice). Persistent mappings prevent recreation even after completion/deletion and preserve every manually changed field. Matching creates a local link only, including completed matches; never edit or complete existing remote tasks.
- Preserve the existing ambiguous-create protocol and serialize with manual apply's lock. Count all Todoist creation intents, including ambiguous ones, toward a rolling three-per-24-hour automatic admission cap. Refetch inventory before a new create; changes since judgment force review rather than using stale matching context.
- Save terminal no-action/review/matched/created decisions by exact evidence version in the existing classification ledger. Defer transient failures one hour and capped work 24 hours. Recheck evidence before writes. Prepare and size-check the full request before reserving credit; deterministic input failures become terminal review outcomes without spending. Shared $2 admission/settlement covers capture inference as well as classification. No schema migration or dependency is required for this slice.

## Risks / Trade-offs

Bounded matching cannot establish all-time semantic task equivalence. The supported completion/deletion guarantee covers mapped obligations, plus exact references/recent completed candidates visible to this read. Uncertain cases remain review-only. A lost remote response remains ambiguous and blocks blind replay. No broad automation rollout or quality guarantee follows from passing synthetic tests.

## Migration Plan

Activate merged PR #23 with private backup, migration 0005, coordinated immutable releases and a genuine timer observation. Implement and test capture with synthetic providers/disposable PostgreSQL; open a PR and follow the three-loop Copilot gate. Enable capture only after merge by adding the explicit start timestamp and opt-in flag, observing the three-task daily cap and preserved owned-file publication. Removing the flag disables new task effects without deleting mappings, intents or allowance history.
