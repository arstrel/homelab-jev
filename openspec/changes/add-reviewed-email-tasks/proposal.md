# Proposal

## Why

Collection works, but emails still produce no useful Todoist tasks. Deliver one small manual email-to-task workflow before expanding the processing framework.

## What Changes

- Preview up to ten latest stored complete conversations, using Jev to choose one source action sentence and an existing Todoist destination; exclude Retro and use Inbox for uncertain routing.
- Save a private review file containing proposed titles, destinations and Gmail links. Applying explicitly selected candidate numbers creates only those reviewed tasks.
- Reuse existing write intents and task links for one task per conversation, preserving source links and avoiding duplicate creates on rerun. Unknown remote outcomes stop for manual inspection.
- Keep scheduling, full-backlog cleanup, multi-obligation matching, evaluation tooling, updates/completion and Drive handoff outside this slice.

## Capabilities

### New Capabilities

- `reviewed-email-tasks`: Bounded private task previews and explicitly selected Todoist creation from stored email evidence.

### Modified Capabilities

None. Main specs have not been archived; this is a limited manual precursor to the broader planned reconciliation workflow.

## Impact

One manual CLI workflow, narrow domain/application/provider/PostgreSQL code, synthetic and disposable PostgreSQL tests, a short runbook and affected OKF claims. Reuse existing SDKs and tables; no new dependency, migration, service or scheduler. Implementation tests do not transfer real email to Jev or create live tasks.
