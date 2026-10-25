# Tasks

## 1. Read-only diagnostics

- [x] 1.1 Add the SDK-free status contract and PostgreSQL observation adapter with fixed readiness checks, one read-only consistent snapshot and whitelisted aggregates; verify disposable PostgreSQL tests cover absent/older/current/conflicting schema, uninitialized state, retry timing, unknown failures, unbound jobs, concurrent ownership/commits and unchanged rows/journal.
- [x] 1.2 Wire CLI and npm `mail:status` without changing legacy status or sync behavior; document fields/exit semantics and verify unit/compiled CLI tests cover DB-only configuration, early argument rejection, zero provider calls, sanitized unavailable reports and connection closure.

## 2. Pilot preparation and documentation

- [x] 2.1 Add the bounded manual runbook and explicitly pending evidence-report template, including reviewed build/target preparation, existing migration procedure, 20-run/60-minute stop limits and strict no-change predicate; verify documented commands/options and run offline plus disposable PostgreSQL gates before any live session.
- [x] 2.2 Update affected OKF concepts for diagnostics and the observation boundary, reviewing source snapshots and preserving human-review/deadline metadata; verify document links, OKF checks and strict OpenSpec validation without claiming live results.

## 3. Controlled operational evidence

- [x] 3.1 For an explicitly authorized operational session, privately verify the selected target/backup and any required existing migration deployment, capture baseline and bounded manual sync/status runs, and publish only sanitized observations; verify live catch-up plus a later strict no-change run before completing this task or parent 2.4, otherwise record incomplete/failed evidence and leave both open.

## 4. Integration acceptance

- [x] 4.1 Run the full offline and disposable PostgreSQL gates and review the final diff/report against the capability scenarios; verify scheduled operation, classifier quality and live recovery are not claimed without evidence, no new migration is introduced and normal Git/CI gates remain enforced.
- [x] 4.2 Count only pending jobs bound to current source evidence as classification backlog, retaining deferred work and a separate unbound diagnostic; verify superseded/completed/other-mailbox exclusions and unchanged stored rows against the classifier selector.
- [x] 4.3 Remove unused foundation repository mutations and test-only queries, preserving production raw status and schema-constraint/migration coverage through direct disposable fixtures; update affected documentation and reviewed OKF sources and verify offline/disposable PostgreSQL checks.

Planning creates no runtime changes or live authorization. Tooling can be delivered with task 3.1 pending when no operational session has been authorized or live acceptance remains incomplete; report that state explicitly rather than marking the change complete.

October 25 reconciliation: the historical manual sessions remain incomplete as originally recorded. Later retrieval repair, coordinated activation and the strict no-change timer pair now satisfy the combined live acceptance; see [the dated evidence](../../../docs/mail-observation-evidence.md#october-25-catch-up-and-no-change-acceptance). Live expiry recovery and classifier quality are not claimed.
