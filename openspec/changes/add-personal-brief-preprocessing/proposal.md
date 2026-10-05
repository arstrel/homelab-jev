# Proposal

## Why

The Daily Inbox Digest and Daily Life Plan repeatedly interpret incoming mail and carry obligations forward, which can duplicate work and resurface stale items. Use Jev to preprocess changes continuously and keep actionable obligations in the user's existing Todoist projects so the daily planner can select relevant work for upcoming calendar blocks.

## What Changes

- Add a Mac mini worker that synchronizes Gmail every five minutes using incremental history, including relevant sent replies and changed threads.
- Classify messages with TypeSafe AI's Jev, distinguish actions from information and noise, and match obligations to existing Todoist tasks before creating new ones.
- Automatically route sufficiently certain new actions into existing themed Todoist projects; capture uncertain actionable candidates in Inbox for review.
- Treat Todoist as authoritative for task content, placement, and user completion. Preserve manual edits and prevent duplicate or resurrected tasks.
- Use Retro as user-authored feedback for subsequent planning and reconciliation, excluding it from email-task routing.
- Publish a compact, timestamped Markdown snapshot to Google Drive and adapt the existing scheduled tasks to combine it with live Todoist, Calendar, and existing Drive context.
- Use existing Docker PostgreSQL for synchronization checkpoints, source-to-task mappings, classification results, and retry records. Redis is available but optional.
- Deliver in stages: observe and evaluate classifications, enable automatic task creation, then integrate the daily briefs. Track implementation through tasks.md.

## Capabilities

### New Capabilities

- `mail-synchronization`: Five-minute incremental Gmail ingestion and recovery.
- `email-classification`: Narrow typed Jev judgments with source evidence, uncertainty, and evaluation.
- `todoist-obligations`: Project routing, obligation matching, automatic capture, and respect for user changes.
- `retro-feedback`: Read user-authored feedback and distinguish finite tasks, reusable options, and broad goals.
- `brief-handoff`: Fresh Drive snapshots and Todoist-aware scheduled planning.
- `worker-operations`: Reliable processing, credential handling, diagnostics, and PostgreSQL bookkeeping.

### Modified Capabilities

None. The project is greenfield and has no existing capability specs.

## Impact

- New application code and operational configuration under `/Users/artem/source/jev`; none exists yet.
- External dependencies: Gmail API, Google Drive API, Todoist API, and TypeSafe AI API. The worker needs its own Google and Todoist authorization; connected ChatGPT apps do not supply worker credentials.
- Existing scheduled chats: Daily Inbox Digest and Daily Life Plan. Their actual latest-file retrieval and Todoist access must be demonstrated before enabling the handoff.
- Existing PostgreSQL and optional Redis containers; deployment must preserve other homelab workloads.
- Gmail label writes, automatic task completion from email inference, calendar writes, push webhooks, full historical inbox cleanup, and additional source integrations are outside the first release.
