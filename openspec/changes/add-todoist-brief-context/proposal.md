# Proposal

## Why

The published email brief has no view of existing Todoist work. Add current task context and explicit source-link associations so the reader can see which email actions already have a task.

## What Changes

- Extend the existing manual brief command/file with active project-grouped open tasks, task links and existing due dates.
- Recognize exact Gmail conversation links in task descriptions; annotate matching email actions as already tracked without semantic inference or completion claims.
- Exclude Retro from actionable inventory and disclose retrieval timestamps, bounded coverage and failures.
- Fetch Todoist afresh on every publication; keep Todoist authoritative and avoid a second database task inventory.

## Capabilities

### New Capabilities

- `todoist-brief-context`: bounded read-only task context and explicit Gmail link associations in the existing Drive brief.

### Modified Capabilities

None. The existing email publication capability is present as an unarchived change, not a durable spec; this delta adds Todoist behavior without rewriting its cache/publication contract.

## Impact

Existing brief domain/application/CLI, one Todoist read adapter, tests and documentation. Reuse the current SDK, command, Drive ID and collector. No new dependencies, migrations, task writes, model judgments, Retro interpretation or scheduling changes.
