# Automatic Todoist capture pilot

This opt-in stage reuses the existing publisher, task writer, source mappings and $2 inference allowance. It creates at most one task in a cycle and admits at most **three Todoist creation intents per rolling 24 hours**, including ambiguous reservations and manual Jev creates. No new service, dependency or migration is needed beyond the already deployed migration 0005.

## Enable after merge

Deploy a reviewed merged immutable release using [the publisher runbook](../deploy/brief-refresh.md). In the owner-only environment, set an explicit UTC source-time boundary and the stable Retro exclusion ID:

```dotenv
JEV_CAPTURE_SINCE=2026-10-25T18:00:00.000Z
TODOIST_RETRO_PROJECT_ID=your-existing-retro-project-id
```

Choose the actual intended start time during initial activation, rather than copying the example. Preserve this boundary on ordinary release upgrades so pending post-activation work is not dropped. `JEV_CAPTURE_SINCE` must be a canonical ISO UTC timestamp, not in the future. Messages before it are excluded even when collected later. Then add `--capture-tasks` to the publisher arguments, preserving `--classify-pending --max-new 0` and no `--retro-review`:

```sh
npm run brief:publish -- --max-new 0 --classify-pending --capture-tasks
```

The command above is an explicit one-shot invocation, not timer acceptance. Configure the immutable release in launchd for recurrence. Existing scheduled classification remains active without capture. Removing only `--capture-tasks` disables automatic task effects while preserving all tasks, mappings, outcomes, intents and spending history.

## Decisions and ownership

Each cycle examines at most five current complete conversations with saved action/request classification, requiring matching input identity and at least 0.95 classification confidence. Owner exclusions apply. Current active projects supply allowed destinations, with Retro excluded. The reader requires complete bounded pagination for open tasks and tasks completed within the last 30 days; at most 100 task candidates enter context. Historical completed tasks from other/archived projects remain matching candidates but never become creation destinations.

A durable mapping suppresses another create across all evidence versions, even if the user moves, renames, completes or deletes the task. Exact Gmail references are matched before inference; competing references require review. Otherwise one pinned Jev request judges concrete eligibility, a source-supported action sentence, project and existing-task identity. It receives necessary email text/direction/timestamps, project context and task titles/completed hints, not task descriptions or provider IDs. The full request is capped at 32 KiB. The complete serialized request is prepared and validated before shared durable admission. Deterministically oversized input stays review-only until its evidence changes, without reserving credit; dispatched failures retain the maximum reservation and valid usage settles once.

Only a confidently required finite action with a supported title, a known themed project and confident `no existing match` can create. Unknown action/routing/matching or confidence below 0.95 stays review-only. Inbox is a review fallback, not an automatic destination. The threshold is a conservative pilot rule, **not calibrated classifier quality**. Model matching cannot establish all-time semantic equivalence.

Before semantic linking or creation, refetch inventory and recheck evidence; changes force review. Existing tasks receive no content/project/date/description/label/completion updates. Matching creates a local source link only. A new task uses the existing stable source key, caller request ID, durable ambiguous intent and Gmail provenance. New creation stops after one success so the next cycle uses fresh matching context. An uncertain write stops the batch and blocks blind source replay; inspect the source marker and existing intent before manual recovery.

Terminal outcomes are saved per exact evidence version in the classification ledger. Failures defer one hour; a failed post-inference verification read also stops the batch to avoid paying again on the next five-minute tick. Capped work defers 24 hours. No-action/review judgments wait for new source evidence or manual review; changing a threshold does not silently grant a write. Capture annotations on the displayed email sample and a cycle summary appear in the owned Drive brief, including matched-completed, review, failure and ambiguous states. Logs contain aggregate counters; task titles/source text remain private.

## Deliberate boundary

The completed/deleted guarantee covers mapped obligations, plus known exact references and recent completed candidates visible to this bounded read. One task per conversation remains the existing identity rule: general multiple obligations per thread and arbitrary cross-thread reconciliation remain future work. Waiting labels, inferred resolution/completion, due-date extraction and field-edit synchronization are also outside this slice. Current Todoist state always takes precedence over historical capture annotations.

Offline and disposable PostgreSQL tests cover admission, matching, owner edits, completed/deleted mappings, ambiguity and display. A bounded live shadow check used two real conversations, returned no automatic candidate and made zero Todoist writes. See [verification](automatic-capture-evidence.md); the merged pilot was activated on October 25 and a genuine timer cycle was verified. No post-boundary sources were available then, so real task-creation acceptance remains outstanding.
