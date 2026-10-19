# Manual incremental Gmail synchronization

Use pinned Node, build, explicitly migrate the reviewed target and run:

```sh
nvm use
npm run build
npm run db:migrate
npm run mail:sync -- --days 30 --max-pages 5 --max-threads 20
```

The command reads Gmail and writes PostgreSQL. Review [migration operations](migrations.md) privately first. Implementation/tests have not migrated or synchronized the operational database. Google credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `gmail.readonly`) plus normal `DB_URL`/`DB_*` configuration suffice. No Jev/Todoist/Drive key, Redis, webhook or automatic scheduling is involved.

## Discovery and restart

First capture a profile history anchor, then freeze the bootstrap window (default 30 days). Round the upper boundary to the next second so mail already covered by that anchor is included. Bootstrap pages resume the same stored window and continuation across bounded runs. Explicit `--days` must match initialization; omit it to accept the saved window. There is no reset flag.

After bootstrap, history starts at the original anchor, including mail arriving during the scan. Discovery is not a mailbox point-in-time snapshot. The system retrieves current available thread versions, not every intermediate historical revision. History covers additions (incoming/sent), deletions and label changes without unread/Inbox filters. Intermediate pages preserve the anchor and continuation; only exhaustion advances the completed discovery cursor. IDs and progress commit atomically. Failed pages remain the next attempt; prior committed work survives. Repeated tokens or a chain exceeding 2,000 pages stop visibly. Invalid continuation tokens remain explicit diagnostic failures, not an automatic reset.

## Durable retrieval

`mail_retrievals` is a durable retrieval backlog, separate from classification `pending_jobs`. Complete evidence, its exact-bound job and acknowledgement of the selected work generation commit together. Rediscovery bumps generation; stale acknowledgements cannot erase newer work. Existing versions/jobs survive later discovery progress and classifier failures. No model is invoked.

Partial/failed conversations remain pending, with fixed reasons and next-attempt times. Backoff is 5, 10, 20, 40, then 60 minutes maximum, without an attempt-discard limit. Due work is retried even without new mail; rediscovery makes changed work due again. Unsupported/oversized bodies stay visible gaps and get no complete fingerprint/job. Running more frequently does not bypass backoff.

Gmail reads share a 1.5-second minimum gap between request starts within each invocation, including profile/history/discovery and separately stored text. The first request can start immediately. Pacing is cancellable and counts toward the existing 120-second deadline; it does not coordinate other processes or clients.

Recognized throttling reports `rate-limited` and stops the batch. A discovery throttle prevents backlog retrieval in that invocation. A conversation/body-part throttle defers only the attempted retrieval using normal durable backoff, then leaves later work untouched. Completed evidence/jobs survive; evidence freshness stays unchanged while work/failures remain. DB-only `mail:status` recognizes this failure category. No SDK retry or provider response text is exposed.

Confirmed missing threads, draft-only threads, bootstrap selections with no recent non-draft mail, and threads with any non-draft Spam/Trash label are acknowledged with visible missing/excluded counts and no new evidence. Whole-thread Spam/Trash exclusion is conservative. Old evidence, jobs, mappings and user tasks are preserved. History-selected older threads retain context. Label-only replay of known complete evidence can update observations without duplicate versions/jobs.

Statement failure rolls back its bounded transaction. Lost commit acknowledgement can leave an unknown outcome; counts report confirmed results only. Replay uses saved state and uniqueness, never an assumption that nothing committed.

## Ownership and bounds

One dedicated PostgreSQL connection owns a mailbox advisory lock and every sync transaction. An overlapping command skips without provider calls. Connection loss cancels reads and prevents that same connection committing later state. Finally destroys the session and closes the pool; remote reads never occur inside transactions.

Defaults: five discovery steps per run (`--max-pages`, 1–20), 20 retrieval attempts (1–500), up to 100 provider records per requested page; reject decoded pages over 2,000 distinct threads without progress. Each attempted discovery page and each recovery initialization consumes a step, including expired-history attempts. `pagesCommitted` counts only committed pages. Mapped snapshot pages contain at most 100 threads. Existing [retrieval limits](gmail-preview.md) apply: shared 120-second provider deadline, 200 request operations, per-request timeout/response caps and MIME/body limits. Retrieval processing is sequential. Database connection/statement timeouts remain active; the provider deadline is not a whole-command transaction timeout. Cancellation stops new reads/commits; an already committing bounded transaction finishes or rolls back.

## Report and freshness

Use DB-only `npm run mail:status` to inspect stored progress and retry timing between invocations, including while sync owns its lock. See the [observation procedure](mail-observation.md) for schema-readiness semantics and the bounded manual pilot. Legacy `status` retains its ledger-count contract.

Only fixed counts, reasons and timestamps are printed. Never print IDs, page tokens, anchors, subjects, addresses, fingerprints, bodies or raw exceptions. `queuedReferences` counts deduplicated references per committed page, not unique conversations across the whole run.

| Field | Meaning |
| --- | --- |
| `discoveryCaughtUp` | This run exhausted history; evidence may still be pending |
| `pendingRetrievals` / `retryingRetrievals` | All remaining work / work with prior failures, including not-yet-due retries; null means unknown |
| `discoveryCheckedAt` | Last exhausted history observation |
| `evidenceSyncedAt` | Last exhausted history observation whose backlog drained; uses observation time, not a later finish time |
| `evidenceComplete` | This run caught up without pending work or operational failures; no classifier/task freshness claim |
| `discoverySteps` / `pagesCommitted` | Discovery work consumed / pages durably queued during this invocation |
| `recoveryCount` | Durable count of recovery initializations |
| `recoveryStartedAt` / `recoveryCompletedAt` | Latest recovery start / successful backlog-drained observation; completion remains null during that recovery |
| `historyGap` | Sticky indication that expired history could not be replayed; remains true after successful bounded recovery |
| `recoveryScope` | `recent-window-and-all-mapped-threads` when a history gap has been observed, otherwise null |

Unfinished recovery or retrievals preserve old evidence freshness. After successful recovery, freshness describes the bounded recovered scope; `historyGap` continues to disclose unreplayed history. No-change successful runs advance observation freshness without jobs or Jev calls. Exit 0 means complete scoped evidence catch-up or an explicit overlap skip; exit 2 means unfinished discovery/work due only to caps; exit 1 means failures, retries or cancellation. `downstreamWrites` is zero for Gmail/Jev/Todoist/Drive. PostgreSQL progress/evidence writes are reflected by dedicated counters. Legacy `status` remains ledger row counts.

## Expiry and operational boundaries

History HTTP 404 records `phase: recovery-required` and `historyGap: true`, preserving anchors, backlog, evidence and mappings. Within the remaining step budget (or next invocation), capture a fresh profile anchor and freeze a new window using the stored day count. Atomically snapshot all locally mapped thread IDs and promote existing backlog to history eligibility while preserving retry state. All mappings are a conservative superset of open obligations; recovery needs no Todoist request or token.

`recovery-bootstrap` resumes recent-window pages, then `recovery-mapped` resumes the durable inventory using keyset pages. Threads outside the recent window remain eligible through mapped coverage. Even if a mapping is removed during recovery, its snapshotted thread remains queued. Only after the final mapped page commits does the temporary inventory clear. Then history catches mail received since the new anchor. If that anchor also expires, recovery restarts under the same step/deadline limits, retaining unfinished targets and pending work. Do not clear state or delete mappings to bypass a gap.

Missing mapped mail preserves mappings, jobs and user tasks. Partial evidence keeps recovery incomplete until a later due retry succeeds. Intermediate expired changes and unmapped older conversations outside the window cannot be reconstructed: `historyGap` remains visible even when current scoped evidence is complete. No automatic task completion occurs.

Preview, manual ingestion and legacy checkpoint contracts remain unchanged. The `primary` namespace assumes one configured Gmail account; changing accounts needs a separate ledger/namespace migration. Follow [private evidence/retention](mail-ingestion.md): no automatic cleanup, protect unfinished jobs and treat database/backups as mailbox data. No launchd definition or recurring pilot is activated.

## Acceptance evidence

MSW covers profile/history contracts, decimal IDs beyond safe integers, all change types, pagination, malformed payloads, shared request budgets and history-only expiry. Synthetic application/compiled CLI checks cover caps, cycles, cancellation, exclusions, privacy, invalid options and resource closure. Disposable PostgreSQL covers bootstrap/history restart, mail during scans, failed pages, retries without new mail, label/no-change replay, page/evidence rollback, stale generations, owner skip/loss/release and populated upgrade/failed repair. Recovery tests additionally cover a 101-thread durable mapped inventory, older/missing/partial mapped mail, preserved retry metadata, stale initialization rollback, retained targets and final-page rollback. No live sync or classifier-quality result is claimed.
