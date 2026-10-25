# Jev personal brief preprocessing

Created: October 4, 2026. Updated: October 25, 2026. Status: five-minute collection, automatic classification, private Drive publication and daily-task handoff are deployed; a bounded create-only Todoist capture pilot is enabled. Calibration and full obligation reconciliation remain unfinished. See [progress tracking](#progress-tracking) for evidence and limits.

## Product outcome

Keep a current, source-linked inventory of actionable obligations in the user's existing Todoist projects. Use Jev to reduce repeated email interpretation and provide better inputs to Daily Inbox Digest and Daily Life Plan. The planner selects appropriate actions for upcoming themed calendar blocks, and Todoist completions plus Retro feedback inform the next cycle.

## Agreed requirements

- All project development and artifacts live under `/Users/artem/source/jev`.
- Poll Gmail every five minutes on the Mac mini. Gmail push notifications and public webhooks are unnecessary for this project.
- Use the TypeSafe AI Jev API for bounded classifications, scores, and matching judgments.
- Automatically capture ongoing actionable items in existing Todoist themed projects, with source evidence and duplicate prevention.
- Todoist is the visible, authoritative task inventory. Preserve user edits, placement, and completion.
- Retro is user-authored daily feedback, not an email-task destination.
- Daily Life Plan reads Todoist to select work for upcoming calendar blocks.
- Google Drive holds Markdown artifacts and preprocessing handoff context.
- Use the existing Docker PostgreSQL deployment for processing bookkeeping. Redis is available if a later operational need warrants it.
- Run a Node 24/TypeScript CLI as a native launchd job; use Drizzle with pg and reviewed, versioned SQL migrations.
- Use the approved application/domain/adapter structure and package stack, including Biome, Vitest/MSW, Husky, and npm. See the design for the complete package and command contracts.
- Run full offline checks before every commit and require a fully staged application/configuration validation-input set. Run PostgreSQL integration tests against disposable databases before push and in CI.
- Develop on short-lived branches and merge through PRs with required CI. Deploy reviewed compiled releases independently of the editable checkout.

## Sources and ownership

| System | Owns | Jev integration role |
| --- | --- | --- |
| Gmail | Original messages and threads | Read incremental incoming/sent evidence |
| Jev API | Typed model judgments | Evaluate narrow questions; code enforces policy |
| Todoist | Task content, projects, dates, completion | Create/match actions and honor user corrections |
| Retro project | User's feedback about the day | Read feedback for planning/reconciliation |
| Calendar | Upcoming blocks and commitments | Planner uses block theme and available time |
| Google Drive | Plans, digests, retrospectives, dedicated snapshot | Readable context and worker-to-planner handoff |
| PostgreSQL | Checkpoints, mappings, decisions, retries | Durable operational records, no second task UI |
| Redis | Existing optional infrastructure | No initial correctness dependency |

## Existing Todoist destinations

Observed October 4, 2026. Resolve active IDs at runtime; names and descriptions can change.

| Project | Observed ID | Intended use |
| --- | --- | --- |
| Technical & Career | `6hRfFprhm89HHr8C` | Learning, career development, engineering next actions |
| Personal Projects | `6hRfFpv27WqfGxwM` | Finite personal projects, including homelab implementation |
| Home & Admin | `6hRfFpvP8WGrfc2R` | Household, paperwork, errands, maintenance |
| Masonry & Study | `6hRfFpvwX7H8JFf6` | Masonic practice, study, and related actions |
| People & Social | `6hRfFpr3F734wRJX` | Social plans and relationship actions |
| Explore & Fun | `6hRfFpvxhH4GCP2c` | Optional leisure and experiences |
| Fitness & Health | `6hRfFpwJgcRHcHGx` | Workout/recovery inventory and health-maintenance actions |
| Inbox | `6Crg8QRVP35XgV8P` | Actionable candidates needing review |
| Retro | `6Crg8QRVQHJWwq3x` | Read-only feedback input for this worker |

Project descriptions already supply routing context. Inspection found no sections and one `Assistant` label. A project's name alone does not determine whether an item is mandatory: Fitness & Health and Explore & Fun contain optional reusable inventory.

## User journeys

1. An incoming email creates a concrete obligation. Within an available five-minute processing cycle, Jev classifies it, code matches existing tasks, and a new task is captured in its themed project only when needed.
2. A follow-up or sent reply changes the evidence. The same task receives a relevant update or waiting state instead of a duplicate.
3. The user moves, edits, completes, or deletes a task. Synchronization follows that user state and does not undo it through replay.
4. The daily planner reads current Todoist inventory, the fresh Drive snapshot, Calendar, and prior context. It offers bounded actions fitting the upcoming blocks.
5. The user records what happened in Retro. Subsequent planning considers that feedback and surfaces specific reconciliation suggestions while preserving reusable activities and broad goals.

## Initial release boundary

Email classification, obligation capture/matching, Todoist routing, Retro-aware planning, reliable synchronization, and Drive handoff are in scope. Inferred email completion remains a suggestion in release one. Exact dates require evidence and deterministic validation.

Gmail label writes, automatic completion based solely on model inference, calendar writes, whole-inbox historical cleanup, newsletter/article enrichment, homelab alert triage, general archive search, and additional providers are later changes. The approved architecture leaves room for these without making them prerequisites for the daily-brief loop.

## Implementation choices and pilot limits

Node 24, launchd, Drizzle with pg, the folder/package choices, and the Git/testing gates above are user-confirmed. Bun and Kysely were considered; Node and Drizzle were selected for this project. Their configuration and foundation work are specified in [the design](../openspec/changes/add-personal-brief-preprocessing/design.md) ; the section 1 foundation is implemented.

Implemented choices include isolated PostgreSQL bookkeeping, a configurable 30-day initial mail window followed by incremental history, `jev-current.md` addressed by stable Drive identity, a 15-minute publication cutoff in the installed handoff, and source-supported task titles. The active publisher classifies up to ten current conversations per cycle within a durable $2 lifetime allowance. Optional capture considers up to five recent classified conversations, admits at most three task creations per rolling 24 hours, and preserves existing task fields. It supports one obligation per conversation and bounded matching against open/recent-completed tasks.

Pinned `jev-1.13.0` and provisional capture confidence thresholds of 0.95 are implemented pilot policy, not results of the representative evaluation below. The owner-approved narrow pilot was enabled before the original broad evaluation/rollout acceptance was met; that requirement remains open. Uncertain automatic candidates are recorded for review rather than automatically added to Inbox. Durable review resolution, corrections and waiting/lifecycle metadata remain unfinished.

The user has provided these configuration names: `JEV_API_KEY`, `DB_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. The design uses DB_URL when present and the individual database fields as a fallback. Secret values are excluded from documents, logs, tracked files, and test fixtures; offline and database tests supply independent test configuration.

The worker uses independently configured Google and Todoist authorization in addition to the Jev key. Current ChatGPT connections do not authorize that background process. Actual daily-task retrieval and live-source access were verified separately; see [scheduled handoff evidence](scheduled-brief-evidence.md).

## Acceptance and measurement

The capability specs contain the normative requirements and scenarios. Release evidence must demonstrate:

- Five-minute incremental operation and recovery without repeated classifications of unchanged mail.
- Correct matching and project routing on representative examples, with uncertain cases visible for review.
- No duplicate task after retry, lost response, or concurrent attempt; no recreation of a completed/deleted old obligation.
- Manual Todoist edits survive synchronization; Retro content and reusable inventory are preserved.
- Current-generation Drive retrieval and live Todoist access in both actual scheduled-task contexts.
- Daily-plan recommendations fit calendar blocks and expose stale/failed source processing.
- Reproducible offline checks, commit-content guards, isolated PostgreSQL tests, and required PR checks enforce the approved development workflow.

Measure missed actions, incorrect captures, routing corrections, review rate, latency, and API cost. Evaluate roughly 100–200 representative corrected messages, including held-out examples and edge cases. Report observed trade-offs; do not declare unmeasured accuracy or cost guarantees.

## Progress tracking

The table records delivery as of October 25, not a continuing health guarantee. Historical session reports retain their original gaps; later acceptance is linked explicitly.

| Area | Implemented / observed | Remaining acceptance |
| --- | --- | --- |
| Foundation | Pinned Node/TypeScript, Drizzle/pg, deterministic hooks, isolated PostgreSQL and required CI; [foundation evidence](foundation-evidence.md) | Maintain the existing gates |
| Gmail | Native five-minute collection, immutable exact-bound evidence, paced reads, durable retries and bounded expired-cursor recovery. [October 25 retrieval repair](automatic-mail-evidence.md) cleared the configured scope; [subsequent no-change timer pair](mail-observation-evidence.md#october-25-catch-up-and-no-change-acceptance) advanced freshness without new versions/jobs | Live expired-cursor recovery remains synthetic-only; future mail can create new gaps |
| Classification | Typed validated judgments, owner exclusions, saved decisions and automatic pending-job processing; [recurring activation](automatic-capture-evidence.md#merged-classifier-activation) verified | Representative held-out quality evaluation, correction recording and calibrated thresholds |
| Todoist | Current project/task reads, Retro exclusion, source-supported manual proposals, exact/bounded semantic matching and create-only automatic pilot; [activation](automatic-capture-evidence.md#capture-activation-after-pr-25) verified | Useful live capture/matching, durable review resolution, ambiguous-write reconciliation, multiple obligations per thread and lifecycle updates |
| Retro | Bounded task/comment context and optional typed suggestions; [live publication](retro-brief-evidence.md) verified without task mutation | Complete source coverage, human-reviewed task-kind mapping and useful reconciliation quality |
| Drive / daily routines | Stable private snapshot, recovery/readback and source-gap reporting. [October 23 clock-triggered retrieval and October 25 canonical JSON repair](scheduled-brief-evidence.md) accepted | Specific calendar-block/optional-inventory acceptance example and broader lifecycle rollout |
| Operations | Immutable collector/publisher releases, five-minute cadence, locking and documented disable/restart paths; [collector](mail-worker-evidence.md) and [publisher](automatic-capture-evidence.md) observations | Full cross-provider interruption/rollback rehearsal and complete lifecycle release report |
| OKF | Curated engineering bundle and [public hosted graph](https://arstrel.github.io/homelab-jev/), verified October 25 after PR #27 | Concept review deadlines and draft/unverified status still apply |

At capture activation no post-boundary sources were available, so zero task writes proved enablement and publication wiring only. No useful live task-creation acceptance is claimed. Fresh publication is also separate from complete Gmail, classification and Retro coverage.

The canonical implementation checklist is [tasks.md](../openspec/changes/add-personal-brief-preprocessing/tasks.md). Check a box only when its full stated verification is supported. Partial items have delivery notes explaining what exists and what remains; completed slice changes do not automatically complete broader parent tasks.

The [proposal](../openspec/changes/add-personal-brief-preprocessing/proposal.md) defines scope, the [design](../openspec/changes/add-personal-brief-preprocessing/design.md) defines the approach, and the [six capability specs](../openspec/changes/add-personal-brief-preprocessing/specs/) define behavior. These delta specs describe the target system; they are not evidence that it is already running. Archive the change after implementation and verification to establish the durable specs under `openspec/specs/`.
