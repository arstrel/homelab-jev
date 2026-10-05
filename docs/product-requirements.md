# Jev personal brief preprocessing

Created: October 4, 2026. Status: requirements and implementation plan drafted; implementation has not started.

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

## Proposed implementation defaults

These choices are planning defaults, not additional user-confirmed constraints: TypeScript on Node 24; launchd scheduling; isolated PostgreSQL storage; a configurable 30-day initial mail window; `jev-current.md` addressed by stable Drive file ID; a configurable 15-minute stale-input cutoff; source-based task title templates; waiting/review metadata conventions; an observation pilot before automatic capture. Model version and thresholds are selected using evaluation results.

The worker requires its own Google and Todoist authorization in addition to the existing Jev key. Current ChatGPT connections do not automatically authorize a separate background process. Verify actual scheduled-task access and latest-file retrieval before enabling the handoff.

## Acceptance and measurement

The capability specs contain the normative requirements and scenarios. Release evidence must demonstrate:

- Five-minute incremental operation and recovery without repeated classifications of unchanged mail.
- Correct matching and project routing on representative examples, with uncertain cases visible for review.
- No duplicate task after retry, lost response, or concurrent attempt; no recreation of a completed/deleted old obligation.
- Manual Todoist edits survive synchronization; Retro content and reusable inventory are preserved.
- Current-generation Drive retrieval and live Todoist access in both actual scheduled-task contexts.
- Daily-plan recommendations fit calendar blocks and expose stale/failed source processing.

Measure missed actions, incorrect captures, routing corrections, review rate, latency, and API cost. Evaluate roughly 100–200 representative corrected messages, including held-out examples and edge cases. Report observed trade-offs; do not declare unmeasured accuracy or cost guarantees.

## Progress tracking

The canonical implementation checklist is [tasks.md](../openspec/changes/add-personal-brief-preprocessing/tasks.md). Its eight numbered groups are the delivery milestones, and each task includes verification evidence. Check a box only after its stated verification succeeds. Preserve task-level evidence during implementation and summarize it in a release report.

The [proposal](../openspec/changes/add-personal-brief-preprocessing/proposal.md) defines scope, the [design](../openspec/changes/add-personal-brief-preprocessing/design.md) defines the approach, and the [six capability specs](../openspec/changes/add-personal-brief-preprocessing/specs/) define behavior. These delta specs describe the target system; they are not evidence that it is already running. Archive the change after implementation and verification to establish the durable specs under `openspec/specs/`.
