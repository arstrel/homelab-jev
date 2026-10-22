# Proposal

## Why

Gmail collection currently depends on manual invocations, leaving stored conversations stale between sessions. Schedule the existing paced, bounded sync every five minutes so later task previews and classification have current evidence.

## What Changes

- Add a native user launchd job for collection only, retaining the existing PostgreSQL lock, pacing, retry state and source-freshness semantics.
- Prepare versioned compiled releases from commits on fetched `origin/main`, with recorded Node/revision identity and an explicit private environment path. No implicit migrations.
- Provide install/start/stop/status commands and an operational runbook, including rollback to a schema-compatible release and login/reboot limitations.
- Record bounded live collection evidence separately from unverified recurring-operation acceptance. Include the architecture board in the README.

## Capabilities

### New Capabilities

- `scheduled-mail-collection`: installation and control of the five-minute native Gmail collector using isolated reviewed releases.

### Modified Capabilities

None. This implements the collection subset of the parent worker-operations plan; the complete classification/reconciliation/publication cycle remains planned.

## Impact

Deployment scripts, deployment documentation, offline tests and npm commands. Gmail reads and existing PostgreSQL progress/evidence writes only. No new dependency, migration, hosted Jev call, Todoist/Gmail mutation or Drive publication. Active installation follows merge; no unreviewed worker release is enabled.
