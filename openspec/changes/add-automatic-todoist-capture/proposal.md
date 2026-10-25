## Why

New email now receives typed classification, but useful obligations still require manual Todoist capture. Reuse the existing reviewed creation path for a conservative pilot that checks existing work and preserves the user's task inventory.

## What Changes

- An opt-in publisher stage processes up to five recently classified conversations, creating at most three tasks per rolling 24 hours.
- Confident finite obligations route into current themed projects; uncertain action, routing or matching remains review-only.
- Match saved mappings and exact Gmail references first, then bounded typed matching against current open and recent completed tasks. Never update existing task fields or reopen/recreate mapped work.
- Reuse durable write intents, source identity and the shared $2 inference allowance; record source-version outcomes to avoid repeated calls and blind writes.
- Activate and verify the already merged PR #23 classifier before introducing task writes. The new capture stage remains opt-in and deploys only from a merged reviewed release.

## Capabilities

### New Capabilities

- `automatic-todoist-capture`: capped creation and matching for recent concrete email obligations with explicit review outcomes and preserved task ownership.

### Modified Capabilities

None; the parent proposal remains broader than this pilot, including general cross-thread/multiple-obligation reconciliation and lifecycle updates.

## Impact

Existing publisher composition, Jev/Todoist adapters, PostgreSQL classification/write-intent ledger, native deployment guidance, tests and knowledge documents. No new service, dependency or task-inventory database is introduced.
