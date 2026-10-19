# Design

## Context

See proposal.md for motivation. The merged baseline is `d129ab6` (PR #8). Existing `mail:sync` already prints sanitized per-invocation counters, resumes bounded work and distinguishes discovery from evidence freshness. Its store exposes status only through an exclusive sync session. The legacy `status` command counts ledger rows and cannot diagnose mail freshness or backoff. `mail_retrievals` has attempts, failure and availability time, but no creation timestamp; do not invent an oldest-work age.

The repository has no live sync observation report. Whether operational migrations have been applied must be checked privately during the future pilot, not inferred from code or the prior connection check.

## Goals / Non-Goals

**Goals:** make collection progress inspectable without provider credentials; exercise a bounded manual collection session; distinguish incomplete evidence from pending classification; deliver enough real observations to assess readiness for Jev classification.

**Non-Goals:** a dashboard, automatic observation runner, scheduler, new persistence, migration automation, forced cursor expiry, work deletion, Jev evaluation, Todoist inventory/routing or Drive publication. This is parent task 2.4; the scheduled pilot in 8.1 remains separate.

## Decisions

### 1. A separate DB-only diagnostic boundary

Add `npm run mail:status` and CLI `mail:status` with no command options. Proposed files are `src/application/mail-status.ts`, `src/adapters/postgres/mail-status.ts` and a small composition helper if needed. Add an SDK-free observation reader port to `ports.ts`; inject time for deterministic due/retry counts. Reuse DB configuration, pool bounds and fixed diagnostic conventions. Reject invalid arguments/configuration before adapter creation, close the connection on all paths, and import no provider adapter in this command path. Keep legacy `status` unchanged.

Do not reuse `MailSyncStore.exclusive`: observation must remain available while sync owns its lock. Use one short `REPEATABLE READ, READ ONLY` transaction for readiness, state and aggregates. Existing connection/statement timeouts bound queries. This observes one committed snapshot, not current Gmail or a promise of freshness. Tests must demonstrate that the transaction cannot write and that concurrent sync ownership does not block it.

### 2. Explicit readiness without automatic setup

Compare the recorded `jev_migrations` journal with bundled migration timestamps/hashes and check the fixed required tables/columns inside the two Jev-owned schemas. The installed Drizzle migrator computes SQL SHA-256 hashes; reuse its bundled-file reading rather than introducing a second migration format. No migration function is invoked.

| Schema state | Meaning | Exit |
| --- | --- | --- |
| `ready` | Expected migration history and required schema are present | 0 |
| `migration-required` | No managed journal/schema, or a valid older prefix | 2 |
| `incompatible` | Unmanaged schema, conflicting/newer journal, or missing required structures despite a complete journal | 1 |
| `unavailable` | Readiness/aggregate reads could not complete | 1 |

Non-ready reports use null measurements, never zero placeholders. A ready schema with no primary sync row reports `uninitialized`; its actual ledger counts remain useful. Migration readiness is not an exhaustive corruption check. Unknown driver failures become a fixed database-unavailable diagnostic without raw SQL or connection details.

### 3. Whitelisted report with separate stages

Return `schemaVersion: mail-status/v1`, checked time, readiness, phase, configured window, discovery/evidence timestamps, recovery metadata and aggregate counts. Include all/due/retrying retrieval counts, earliest future retry time, failure counts, pending classification jobs and unbound pending classification jobs for the primary namespace. Do not fetch evidence payloads or source IDs to compute these aggregates.

`retrying` means attempts greater than zero, including not-yet-due work. `nextRetryAt` means the earliest future availability among failed retrievals, not when a scheduler will execute. Failure keys come from the application whitelist (`MailFailure` plus `partial-body`); collapse any other stored text into `unknown-failure`. Classification jobs remain separate: their presence does not invalidate complete Gmail evidence. Report stored timestamps; do not create an inferred healthy/fresh flag or reuse the proposed planner stale cutoff here.

Illustrative output only, with incomplete mail retrieval:

```json
{
  "schemaVersion": "mail-status/v1",
  "checkedAt": "2026-10-20T18:10:00.000Z",
  "schemaState": "ready",
  "phase": "history",
  "window": { "days": 30, "since": "2026-09-20T18:00:01.000Z", "until": "2026-10-20T18:00:01.000Z" },
  "discoveryCheckedAt": "2026-10-20T18:09:00.000Z",
  "evidenceSyncedAt": null,
  "recovery": { "count": 0, "startedAt": null, "completedAt": null, "historyGap": false, "scope": null },
  "retrievals": { "pending": 2, "due": 0, "retrying": 2, "nextRetryAt": "2026-10-20T18:14:00.000Z", "failures": { "partial-body": 2 } },
  "classification": { "pendingJobs": 36, "unboundPendingJobs": 0 },
  "readOnly": true,
  "providerCalls": 0,
  "exitCode": 0
}
```

Exit 0 says the diagnostic succeeded, not that collection/classification has finished. Null evidence time is a visible gap; the 36 classification jobs are expected inputs for the next feature.

### 4. Reuse manual sync for the pilot

Create `docs/mail-observation.md` with a report template and an operator sequence. An automatic multi-run runner would introduce orchestration and failure policy already reserved for the cycle/launchd work. Use the existing bounded command instead:

```sh
npm run mail:status
# Only after private target/backup review, explicitly apply any required existing migrations.
npm run mail:sync -- --max-pages 5 --max-threads 20
npm run mail:status
```

The first uninitialized sync uses the existing 30-day default. Omit `--days` on resumed runs; respect saved configuration, never reset state to obtain a smaller window. Use a clean reviewed checkout, record its full commit and pinned runtime, build from it, and capture a baseline. This does not implement immutable release installation.

For the pilot, cap the manual session at 20 sync invocations or 60 minutes elapsed, whichever occurs first; each invocation retains its existing request/deadline limits. Stop early for incompatible schema, revoked credentials, persistent database/provider failure or cancellation. Respect saved retry dates rather than polling failures aggressively. Reaching a cap is incomplete evidence, with state retained for later continuation; extending the pilot is a new deliberate session, not an unbounded loop.

After a complete catch-up, perform a separate subsequent run with a later observation time. A strict no-change sample requires `queuedReferences = 0`, `retrievalsAttempted = 0`, `newVersions = 0`, `newJobs = 0`, complete evidence and a later `evidenceSyncedAt`. If mail/labels changed, record the run honestly and use a later attempt within the same budget; do not relabel it no-change. No five-minute availability claim is made from two manual observations.

Do not manufacture expired anchors or add mappings in the live database for coverage. Recovery, missing mapped mail and interruption retain their synthetic acceptance evidence unless naturally observed. Existing partial-body limitations can prevent catch-up; diagnose and report them rather than discarding evidence or changing coverage policy in this slice.

### 5. Evidence report and completion boundary

Create `docs/mail-observation-evidence.md` during implementation/observation, initially explicitly pending. After an authorized live session, record:

- reviewed commit/runtime, configured day count, observation times and per-run duration;
- pre/post readiness and phase, discovery/evidence timestamps, queue/retry summaries and recovery/gap indicators;
- per-run caps, new version/job counts, exclusions/partial/missing counts and fixed reasons;
- whether the strict no-change predicate passed, and why a blocked/incomplete sample did not;
- a matrix marking bootstrap/catch-up/retry/no-change/recovery as live-observed, synthetic-only or not observed;
- zero Jev calls and zero Gmail/Todoist/Drive writes as properties of the executed command paths, supported by provider-boundary tests; do not present these as an independent audit of all account activity;
- limitations and the next focused action.

Use only reviewed whitelisted values in committed reports. Keep any intermediate captures outside tracked paths; never copy `.env`, raw database rows or provider responses. There is no new private-data store, telemetry service or report generator. Existing private PostgreSQL evidence/backups retain mailbox-level protections.

A report with gaps is a valid partial deliverable; parent 2.4 and the live-observation task remain unfinished until the no-change acceptance actually succeeds. Tooling merge alone cannot complete them. Do not claim task 8.1, classifier quality or a live recovery test.

### 6. Verification stays deterministic

Unit/compiled CLI tests cover configuration before side effects, DB-only composition, report sanitization, null/zero semantics and resource cleanup. Disposable PostgreSQL tests cover no schema, prior/current/conflicting migration histories, uninitialized state, retry timing and failure aggregation, pending versus unbound classification jobs, read-only enforcement and observation during held sync ownership. Preserve rows and journal before/after reads and test coherent aggregates under a concurrent commit. No live credentials enter tests or Git gates. Live pilot evidence is a separate manual operation.

## Risks / Trade-offs

- Real partial bodies may prevent evidence completion → retain retries, report an incomplete pilot and plan a separate coverage-policy fix if needed.
- Mail arriving between observations may prevent a strict no-change sample → record changed runs and stop at the session budget without claiming success.
- Journal checks cannot prove every possible database invariant → fixed readiness checks plus existing migration/integration tests; report unknown reads conservatively.
- Diagnostic counts can be mistaken for provider freshness → retain stored observation times and distinguish retrieval from classification backlog.
- A pilot stores private mail in the operational database → use the existing explicit target/backup/migration procedure and keep committed evidence aggregate-only.

## Migration Plan

This change needs no new migration. Implementation adds the diagnostic and runbook first and passes the normal gates. The future live session explicitly selects the operational target and reviews any pending existing migrations through 0004 using `docs/migrations.md`; planning does not authorize or execute that operation. Stop the manual session to roll back the diagnostic release; preserve all collected state/evidence. Recovery-phase compatibility restrictions from migration 0004 still apply to an older sync binary.
