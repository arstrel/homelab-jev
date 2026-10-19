# Proposal

## Why

PR #8 completes synthetic coverage for manual Gmail ingestion and cursor recovery, but the repository has no operational synchronization observation report. Before adding Jev classification, we need to see whether real evidence catches up, which retrievals remain blocked, and whether unchanged mail avoids duplicate jobs.

## What Changes

- Add a DB-only, read-only `mail:status` command showing schema readiness, discovery/evidence freshness, recovery scope and aggregate retrieval/retry/classification backlog diagnostics.
- Document a bounded manual observation procedure using the existing `mail:sync` command, with private target/backup/migration preparation and clear stop conditions.
- Deliver a sanitized evidence report distinguishing synthetic recovery results from actual mailbox observations, including a subsequent no-change run when achievable.
- Keep parent task 2.4 open until real evidence meets its acceptance conditions. A partial or failed pilot is useful evidence, not a successful completion claim.
- Leave five-minute scheduling, Jev calls/model selection, task routing/writes, Drive publication and whole-inbox backfill to subsequent changes.

## Capabilities

### New Capabilities

- `mail-observation`: Read-only synchronization diagnostics and bounded, truthful operational observation evidence.

### Modified Capabilities

None. Durable main specs are not yet established. This adds diagnostics and acceptance evidence alongside the completed sync/recovery changes; their synchronization behavior remains unchanged.

## Impact

Expected implementation touches CLI composition and npm scripts, an SDK-free status port/use case, a read-only PostgreSQL adapter, synthetic/disposable-database tests, the observation runbook/report and affected OKF concepts. Reuse existing schema and packages; no new migration or automatic pilot runner is planned. Operational sync stores private evidence in PostgreSQL and requires an explicitly selected live target; this planning change performs no operational access, migration or synchronization.
