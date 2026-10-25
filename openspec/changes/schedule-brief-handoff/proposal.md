# Proposal

## Why

The private brief is useful but currently requires manual publication. Both existing daily-task chats have verified read-only access to the exact Drive file and live Todoist; the next useful step is recurring source refresh and a small permanent handoff.

## What Changes

- Run the existing merged publisher every five minutes as a separate native LaunchAgent, with `--max-new 0` and no Retro review. Refresh sources and saved email decisions without recurring hosted inference or additional spending.
- Preserve the collector and existing scheduled task behavior. Back up the current prompts privately, append a versioned freshness/fallback contract, and preserve schedules.
- Record automatic publication evidence separately from actual scheduled consumer evidence. Arrange follow-up verification if the next daily run has not happened yet.

## Capabilities

### New Capabilities

- `scheduled-brief-handoff`: Regular cached-only publication and freshness-aware consumption by the existing daily routines.

### Modified Capabilities

None. This operational slice does not enable automatic task reconciliation or unattended Jev inference.

## Impact

Deployment template/runbook, public handoff instructions, private prompt backups and live operational evidence. Existing merged compiled application, tables, provider permissions and private Drive destination are reused. No dependency, migration or new application service.
