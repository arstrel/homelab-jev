# Proposal

## Why

Incremental sync currently preserves data but stops discovery when its Gmail history cursor expires. Resumable bounded recovery is needed to re-establish recent evidence and refresh older mapped conversations without resetting task identity or losing pending work.

## What Changes

- Automatically recover within the existing manual `mail:sync` command using a fresh anchor, fixed recent window and durable mapped-thread snapshot.
- Resume recovery pages across capped/interrupted runs, catch mail arriving during recovery through history, and retain all existing backlog/evidence/jobs/mappings.
- Scan every locally mapped thread as a conservative superset of open obligations, avoiding a Todoist integration prerequisite.
- Report bounded recovery scope and the unreplayed history gap separately from current evidence freshness.
- Preserve scheduling, classification, remote writes and live operational activation as later work.

## Capabilities

### New Capabilities

- `mail-sync-recovery`: Resumable expired-anchor recovery, mapped-conversation coverage and explicit recovery/gap reporting.

### Modified Capabilities

None under durable main specs. The completed incremental change remains historical; this change supersedes its stop-only expiry behavior. Parent task 2.3 is completed only after acceptance.

## Impact

Sync state/schema, recovery target migration, application/session ports, synthetic and PostgreSQL tests, runbooks and reviewed OKF. Existing Gmail read methods/scopes and CLI options suffice. No new packages, operational migration, live sync, task completion or remote writes.
