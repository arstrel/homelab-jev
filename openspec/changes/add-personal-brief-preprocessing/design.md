# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The workspace has OpenSpec and AGENTS.md but no application code or tests. A Jev key is present in `.env`; its value has not been inspected. The user reports PostgreSQL and Redis already running in Docker on the Mac mini; their connection details and versions have not been inspected.

On October 4, 2026, Todoist inspection found seven themed projects, Inbox, Retro, no sections, and an `Assistant` label. Tasks include finite actions, reusable activity options, and broad goals. The daily scheduled chats already produce Markdown artifacts in Drive, but the current prompts and reliable latest-snapshot retrieval still need a targeted integration check.

## Goals / Non-Goals

**Goals:**
- Keep business state in Todoist and processing state in PostgreSQL, with explicit ownership of every write.
- Make retries and overlapping runs harmless, including ambiguous outcomes from remote task creation.
- Keep the preprocessing worker independent of GPT scheduling, with an observable freshness contract at the boundary.

**Non-Goals:**
- Running GPT for every incoming email or requiring a GPT API key for the first worker.
- Replacing the daily planner, adding a new task UI, or requiring Redis for a single worker.
- Inferring exact deadlines, making calendar changes, or automatically completing tasks from ambiguous mail or Retro.

## Decisions

### 1. One TypeScript worker scheduled every five minutes

Proposed implementation default: Node.js 24 and TypeScript, using the official TypeSafe SDK and supported Google/Todoist APIs. Use a launchd job with explicit working directory and Node path. This avoids the older system Node encountered during setup. A PostgreSQL advisory lock prevents overlapping runs. Use bounded retries and process pending work on startup; a timer is not a delivery guarantee while the mini is offline.

Alternatives: hourly polling is too stale for the approved cadence; Gmail push/Pub/Sub was explicitly declined. A GPT scheduled run for each synchronization adds unnecessary model orchestration. Dockerizing the worker can be considered later without changing its contracts.

### 2. Incremental ingestion with durable pending work

Bootstrap a bounded recent-mail window and retrieve relevant full threads; proposed default is the last 30 days, configurable for the pilot. Include relevant incoming and sent messages, not just unread inbox mail. Use Gmail history to ingest subsequent changes. Persist fetched records and pending jobs before advancing the ingestion checkpoint; classification failures remain retryable even after the checkpoint moves. Exhaust history pagination before committing its final checkpoint. An expired history cursor triggers bounded recovery plus re-fetching threads linked to open tasks.

A message or changed thread is processed only when its relevant source fingerprint or decision-policy version changes. Read-state and our own label changes alone do not create new obligations. An unseen older thread can be fetched when a new reply makes it relevant; full inbox backfill remains a later change.

### 3. PostgreSQL as an operational ledger

Use a dedicated Jev schema or database in the existing PostgreSQL deployment, without changing unrelated data. Conceptual records:

| Record | Purpose |
| --- | --- |
| Mailbox checkpoints | Last ingested Gmail history and successful sync time |
| Source records and pending jobs | Minimal source context, fingerprint, processing status, retries |
| Classification results | Model/policy version, typed answers, probabilities, confidence, corrections |
| Source-to-task links | Stable obligation key, Gmail evidence IDs, Todoist task ID, user overrides |
| Write intents | Recoverable Todoist and Drive operations with request identity and outcome |
| Publication state | Drive file ID, snapshot generation, publish time, source freshness |

Todoist owns task text, project, dates, and completion. PostgreSQL caches those fields only for reconciliation; it does not serve a competing editable task list. Redis is optional for future workload needs, not part of initial correctness.

### 4. Narrow Jev judgments and deterministic policy

Send only the relevant message, thread excerpts, candidate existing tasks, and allowed project descriptions. Keep trusted question criteria separate from email data. Ask independent questions for message kind, required attention, obligation match, lifecycle evidence, and project choice. Include unknown/none outcomes. Validate typed answers; compare dates and calculate freshness in code.

Choose project IDs from an allowlist refreshed from Todoist; never interpret an email-supplied project name as a command. Calibrate separate thresholds for actionable-item detection, matching, and routing against corrected representative examples. Threshold values and a pinned supported model are implementation settings to select from measured results, not approved numerical guarantees.

Jev does not generate prose. In the first release, task titles combine a supported action template (for example, Reply to or Review) with source text such as subject/sender. Preserve source excerpts in descriptions. Complex multi-action messages become review candidates rather than invented subtasks. Free-form extraction or GPT-generated titles are optional future extensions.

### 5. Reconcile before creating Todoist tasks

Read Todoist changes each cycle. Match exact source mappings first, then deterministic references (such as repository plus PR number), then Jev-selected candidates. A Gmail thread can contain multiple obligations; use a stable thread/reference plus action fingerprint as the obligation key, not thread ID alone. A task can have evidence from multiple threads.

Capture confidently actionable, confidently routed items in themed projects. Put actionable candidates with uncertain routing or wording in Inbox, marked for review. Keep FYI/noise in digest data without task creation. Proposed labels are `Assistant` for origin, `waiting` for blocked-on-others, and `needs-review` for ambiguity; confirm their conventions against existing planner behavior during the pilot. Labels are not proof of ownership: manage only mapped tasks and never take over unrelated tasks carrying the same label.

Attach source links and a durable source marker to newly managed tasks. Persist a write intent before making a remote request, use the API's supported idempotency facility where available, and reconcile markers after an ambiguous timeout before any retry. Updating new evidence must not generate duplicates or recurring comments every five minutes.

Manual task title, project, dates, and completion override worker proposals. Preserve manually edited descriptions/labels and update only the worker-owned evidence portion. Moving a task supplies a routing correction. Completion or deletion suppresses replay of the same old obligation; a genuinely new request requires new evidence and a separate key. Completion is explicit user state; inferred email resolution is recorded as a suggestion for the planner/user in release one.

### 6. Retro and activity inventory inform the planner

Retro is a feedback input, excluded by project ID from routing. Preserve its content and existing archive workflow. Match specific self-reports to candidate tasks and surface reconciliation suggestions with evidence, without automatically closing broad sets of setup steps.

Distinguish finite actions, reusable activity options, and broad goals in planner context. Begin with known examples and an explicit reviewed mapping; avoid rewriting existing tasks to encode this distinction. Reusable activities stay available after a recorded session. Goals guide selection of a concrete next step. Retro statements about preference, workload, and completed work inform planning but are not medical or scheduling directives generated by the worker.

### 7. Drive snapshot as a one-way handoff

The worker owns a dedicated `jev-current.md` file addressed by stable Drive file ID. Publish after a successful processing cycle, including freshness-only updates when no mail changed, using a versioned snapshot generation; retry failed publication without fabricating freshness. Include the last successful Gmail/Todoist syncs, pending failures, new actions, waiting tasks, resolution suggestions, uncertain cases, and source/task links. Keep detailed email bodies out of the snapshot unless needed as short evidence.

The daily tasks read that snapshot and live Todoist; Calendar supplies upcoming block times/themes and existing Drive artifacts supply context. Drive is a readable export, not a task authority. Do not feed yesterday's generated digest back into the ledger as independent evidence. The worker does not edit GPT-owned plans, digests, or retrospectives.

Proposed freshness default: flag the handoff as stale when the last successful required source sync is more than 15 minutes old. Measure actual scheduling behavior and make this configurable. Each scheduled task must retrieve the current file generation in a real test, rather than relying on search indexing or assuming local access. If stale/unavailable, explicitly fall back to live connected sources where available and identify remaining gaps. Periodic scheduling has a race window; include an extra refresh before the known morning runs once their actual times are verified.

### 8. Independent credentials and minimal stored content

The worker reads its Jev key from local configuration and obtains its own Google OAuth authorization and Todoist token/OAuth grant. ChatGPT connections remain separate. Start with Gmail read access and permissions for the dedicated Drive outputs and Todoist actions needed by the pilot. Never commit or log credentials; avoid logging raw message bodies. Exclude secret files before introducing source control. Verify provider API scopes and retry/idempotency semantics during adapter work.

Retain mappings, suppressions, and decisions needed for replay safety. Proposed pilot default: retain raw source excerpts for 30 days, then re-fetch when needed; retain sanitized evaluation fixtures/corrections and minimal provenance for active tasks. Document retention and ensure credentials are not included in backups or sample fixtures.

## Risks / Trade-offs

- Wrong action/routing judgment -> Separate thresholds, corrected examples, explicit unknown outcomes, and review candidates.
- Duplicate tasks after uncertain remote writes -> Durable write intents, source markers, supported request identities, and reconciliation before retries.
- Manual edits overwritten -> Todoist field ownership and mapped-task-only updates with tested merge behavior.
- Mini outage or API failure -> Durable jobs, bounded retries, recovery sync, and honest freshness in the snapshot.
- Stale Drive retrieval -> Stable file ID and generation checks in actual scheduled runs; live-source fallback.
- Todoist backlog inflation -> Create concrete obligations, retain optional ideas as optional, and report corrections/noise capture during the pilot.
- Sensitive mail sent to hosted Jev -> Minimize state and define excluded source categories before running the real-data pilot.

## Migration Plan

1. Verify connectivity to existing PostgreSQL, supported APIs, and the two actual scheduled-task contexts. Preserve the current task prompts for rollback.
2. Add isolated Jev storage and run one-shot read-only ingestion/classification on a bounded sample. Report results and corrections.
3. Start the five-minute observation schedule and verify recovery/replay behavior without Todoist writes.
4. Enable mapped task creation/routing in the existing projects and Inbox; verify human edits and duplicate prevention.
5. Publish and read back the dedicated Drive snapshot, then update daily-task instructions and observe real executions.
6. For rollback, disable the worker and restore prior task prompts. Keep existing Todoist tasks and Drive artifacts accessible; retain ledger mappings so restarting does not duplicate them. Never bulk-delete tasks as rollback.

## Open Questions

- Deployment-specific values: PostgreSQL connection/schema name, launchd label, Google client registration, Todoist worker credential, Drive folder/file IDs, and actual morning run times.
- Pilot configuration: supported pinned Jev model, measured thresholds, initial 30-day window, raw-excerpt retention, and 15-minute freshness cutoff. These are documented defaults to tune without changing capability contracts.
- Naming of waiting/review labels and the reviewed task-kind mapping, checked against current planner conventions before enabling the relevant writes.

## References

- [Gmail incremental synchronization](https://developers.google.com/workspace/gmail/api/guides/sync)
- [TypeSafe primitives](https://docs.typesafe.ai/introduction)
- [Jev documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [Scheduled tasks and connected sources](https://learn.chatgpt.com/docs/automations)
- [macOS timed jobs](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html)
