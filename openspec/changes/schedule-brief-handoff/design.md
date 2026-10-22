# Design

## Context

See proposal.md. The merged publisher already owns one recoverable Drive destination, has a separate PostgreSQL overlap lock and a two-minute bounded provider budget. Current scheduled task contexts passed exact-file, live Todoist and Calendar probes. Those manual chat probes do not prove scheduler execution.

## Goals / Non-Goals

**Goals:** Keep source context current, connect existing routines with explicit degraded fallbacks, and preserve reversible operational configuration.

**Non-Goals:** Recurring inference, a spend-accounting platform, task reconciliation, prompt replacement, or migration of existing ChatGPT tasks into Codex automations.

## Decisions

- Use a separate five-minute LaunchAgent invoking an immutable **merged** release of the existing `brief:publish --max-conversations 10 --days 7 --max-new 0` command. No `--retro-review`: scheduled refresh replaces ephemeral interpretations with current source context and an explicit not-requested state. This incurs zero Jev requests and keeps the existing $2 allowance intact. Uncached email remains visibly uncertain/capped; existing direct Gmail routine coverage remains necessary.
- Provide a small plist template and deployment runbook rather than extending the collector installer into a generic service manager. Pin the runtime, release and environment paths; keep private logs. Do not modify the existing collector configuration.
- Append the same versioned handoff to the existing saved prompts after private backups and read-only verification. Preserve original title, schedule, permissions and instructions. Fetch the exact file fresh per run, record generation and timestamps, use a 15-minute publication cutoff, and assess source freshness independently. Read current Todoist/Calendar directly. Existing routine writes remain governed by the original instructions.
- A scheduler “Run now” can verify the scheduled execution surface but is distinct from a clock-triggered daily run. Record each separately; if tomorrow's timer has not fired, keep that acceptance pending and schedule a quiet follow-up in this thread.

## Risks / Trade-offs

- Incomplete collection and uncached judgments → retain explicit source gaps and original direct Gmail fallback; a fresh file is not a complete inbox.
- Mini sleeps or login is absent → launchd freshness expires; consumers continue with labelled direct-source fallback.
- A context-only refresh removes optional Retro model results → disclose that behavior; source feedback remains available to the planner.
- Prompt edits can affect unrelated routine behavior → append only, keep exact private backups and verify unchanged title/timing; rollback restores the saved prompt.

## Deployment / Rollback

Archive and build the selected merged SHA outside the checkout using locked dependencies and pinned Node, check schema without migrating, validate/install the private plist and observe two automatic publications. Back up any prior publisher plist before activation. Stop/unload only the publisher to disable refresh; keep Drive file and ledger intact. Restore the previous plist or saved prompts for rollback. Do not reset publication intents or alter the collector.
