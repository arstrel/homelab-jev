# Manual Gmail observation

This procedure exercises collection before Jev classification. It uses [manual synchronization](mail-sync.md) and the DB-only `mail:status` diagnostic. It does not install a schedule or contact Jev, Todoist or Drive. Gmail reads and private PostgreSQL evidence/progress writes occur only during explicit sync invocations.

## Read-only diagnostic

Use the pinned runtime and a fresh compiled build:

```sh
nvm use
npm run build
npm run mail:status
```

Only normal `DB_URL`/`DB_*` configuration is required. The command rejects options, never initializes state or applies migrations, and does not acquire the sync advisory lock. It reads one committed `REPEATABLE READ, READ ONLY` snapshot. It can run while sync owns its connection. A pool/connection failure yields a fixed database-unavailable report; secrets and raw exceptions are excluded.

| Field | Meaning |
| --- | --- |
| `schemaVersion` / `checkedAt` | `mail-status/v1` and injected observation-start time |
| `schemaState` | `ready`, `migration-required`, `incompatible` or `unavailable` |
| `phase` / `window` | Saved sync phase and day/window bounds; `uninitialized` plus null window when no sync row exists |
| `discoveryCheckedAt` / `evidenceSyncedAt` | Stored discovery and completed-evidence observations; status never advances either |
| `recovery` | Count, start/completion, sticky history gap and bounded recovery scope |
| `retrievals.pending` / `.due` / `.retrying` | All remaining retrievals / availability at or before checked time / attempts greater than zero |
| `retrievals.nextRetryAt` | Earliest future availability among failed retrievals, not a promised execution time |
| `retrievals.failures` | Counts under fixed failure names; unrecognized text becomes `unknown-failure` |
| `classification.pendingJobs` / `.unboundPendingJobs` | Pending processing jobs and those lacking exact evidence bindings; separate from retrieval completeness |
| `readOnly` / `providerCalls` | True and zero for this command path |
| `reason` | `database-unavailable` on failed reads, otherwise null |

`schemaState: ready` exits 0 even when work remains or sync is uninitialized. Missing migrations exit 2; incompatible/unavailable storage exits 1. Invalid arguments/configuration use the existing sanitized CLI error path and exit 1. No provider freshness/health conclusion follows from exit 0. Non-ready measurements are null, never invented zeros.

Readiness compares bundled SQL hashes/timestamps with the managed migration journal and checks required table/column presence in Jev-owned schemas. A valid older prefix requires migration; conflicting/newer history or an unmanaged/incomplete schema is incompatible. These checks are not an exhaustive corruption or permission audit. Do not repair or remove journal records to make status pass.

## Prepare a controlled session

1. Select the reviewed commit, verify a clean checkout and record its full SHA and pinned Node version privately. Build from that checkout after the normal offline and disposable PostgreSQL gates pass. Do not use a stale `dist` directory as evidence of the selected commit.
2. Privately verify that the ignored environment selects the intended database and Gmail account. Do not paste connection strings, email addresses or tokens into the report. A past connection check is not evidence of current grants.
3. Run `npm run mail:status`. If migrations are needed, use the explicit target/backup/review procedure in [migration operations](migrations.md) before applying existing migrations through 0004. This feature introduces no migration. An incompatible target stops the pilot; no automatic repair or migration is performed.
4. Capture the baseline diagnostic, session start time and run/time budget. Use a private location outside tracked paths for intermediate sanitized captures. The committed [evidence report](mail-observation-evidence.md) starts pending until real observations exist.

## Observe under fixed limits

Run each invocation deliberately, recording duration and the whitelisted sync/status results:

```sh
npm run mail:sync -- --max-pages 5 --max-threads 20
npm run mail:status
```

For manual catch-up, allow at least **60 seconds between a batch completing and starting the next 20-thread batch**, and respect any longer saved retry dates. Google's current [quota table](https://developers.google.com/workspace/gmail/api/reference/quota) lists 6,000 units per user per project per minute for new projects and 120 units per full-thread read; 50 such reads alone use that allowance. The configured project quota and other clients can affect available capacity. The application's request/concurrency bounds do not meter quota units. Stop the session if provider failures recur rather than immediately launching another batch; see the [observed throttling](mail-observation-evidence.md#resumed-session-after-pr-12). Waiting counts toward the 60-minute session budget.

The first uninitialized sync uses the existing 30-day default. Resume without `--days` to respect the saved window; do not reset state to shrink it. Preserve all evidence, jobs, retry dates, mappings and suppressions. Unsupported/incomplete bodies remain visible gaps and may prevent complete evidence catch-up.

Stop after **20 sync invocations or 60 minutes elapsed**, whichever occurs first, including preparation pauses after session start. Each run retains its own provider/request/deadline bounds. Stop earlier for incompatible schema, credential failure, persistent provider/database errors or cancellation. Exit 2 from sync is a resumable cap, not complete catch-up. Respect retry times; do not repeatedly poll work that is not due. Record gaps and stop at the budget; extending the session is a separate deliberate decision.

Once a sync run reports complete evidence, perform a separate subsequent observation. A strict no-change sample requires:

- `discoveryCaughtUp` and `evidenceComplete` true, exit 0;
- no queued references, attempted retrievals, new versions or new jobs;
- `evidenceSyncedAt` later than the preceding complete observation.

Mail or label changes can invalidate that sample. Record the actual run and use another attempt only within the remaining budget. No-change requires no Jev call: this command path has no classifier. Zero downstream writes is a command-capability claim supported by synthetic provider-boundary checks, not an independent audit of all account activity.

Do not alter anchors to manufacture live recovery, add temporary task links, delete failed retrievals or mark partial bodies complete to obtain a passing result. Recovery remains synthetic-only unless naturally observed. A manual session does not prove the future five-minute launcher or classifier quality.

## Report and continuation

Publish only reviewed counts, timestamps/window bounds, fixed reasons, configured limits, build/runtime identity, durations and limitations. Exclude credentials, connection details, source/task IDs, history anchors, page tokens, subjects, addresses, bodies, fingerprints and raw database/provider output. Record each acceptance scenario as live-observed, synthetic-only or not observed.

If catch-up/no-change acceptance succeeds, update parent task 2.4 with the evidence. Otherwise leave it and the live-observation task open, label the report pending/incomplete/failed, and identify the next focused action. A tooling PR can be delivered with live evidence pending. Do not relabel an incomplete pilot as successful or claim Section 8 rollout evidence.

Stopping requires no cleanup command; retained work resumes on the next explicit sync. For code rollback, preserve data and follow migration 0004's recovery-phase compatibility limits. No automatic garbage collection or scheduler activation occurs.
