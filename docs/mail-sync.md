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

Confirmed missing threads, draft-only threads, bootstrap selections with no recent non-draft mail, and threads with any non-draft Spam/Trash label are acknowledged with visible missing/excluded counts and no new evidence. Whole-thread Spam/Trash exclusion is conservative. Old evidence, jobs, mappings and user tasks are preserved. History-selected older threads retain context. Label-only replay of known complete evidence can update observations without duplicate versions/jobs.

Statement failure rolls back its bounded transaction. Lost commit acknowledgement can leave an unknown outcome; counts report confirmed results only. Replay uses saved state and uniqueness, never an assumption that nothing committed.

## Ownership and bounds

One dedicated PostgreSQL connection owns a mailbox advisory lock and every sync transaction. An overlapping command skips without provider calls. Connection loss cancels reads and prevents that same connection committing later state. Finally destroys the session and closes the pool; remote reads never occur inside transactions.

Defaults: five discovery pages per run (1–20), 20 retrieval attempts (1–500), up to 100 provider records per requested page; reject decoded pages over 2,000 distinct threads without progress. Existing [retrieval limits](gmail-preview.md) apply: shared 120-second provider deadline, 200 request operations, per-request timeout/response caps and MIME/body limits. Retrieval processing is sequential. Database connection/statement timeouts remain active; the provider deadline is not a whole-command transaction timeout. Cancellation stops new reads/commits; an already committing bounded transaction finishes or rolls back.

## Report and freshness

Only fixed counts, reasons and timestamps are printed. Never print IDs, page tokens, anchors, subjects, addresses, fingerprints, bodies or raw exceptions. `queuedReferences` counts deduplicated references per committed page, not unique conversations across the whole run.

| Field | Meaning |
| --- | --- |
| `discoveryCaughtUp` | This run exhausted history; evidence may still be pending |
| `pendingRetrievals` / `retryingRetrievals` | All remaining work / work with prior failures, including not-yet-due retries; null means unknown |
| `discoveryCheckedAt` | Last exhausted history observation |
| `evidenceSyncedAt` | Last exhausted history observation whose backlog drained; uses observation time, not a later finish time |
| `evidenceComplete` | This run caught up without pending work or operational failures; no classifier/task freshness claim |

Gaps preserve old evidence freshness. No-change successful runs advance observation freshness without jobs or Jev calls. Exit 0 means complete evidence catch-up or an explicit overlap skip; exit 2 means unfinished discovery/work due only to caps; exit 1 means failures, retries, cancellation or recovery required. `downstreamWrites` is zero for Gmail/Jev/Todoist/Drive. PostgreSQL progress/evidence writes are reflected by dedicated counters. Legacy `status` remains ledger row counts.

## Expiry and operational boundaries

History HTTP 404 records `phase: recovery-required`, preserving anchors, backlog, evidence and mappings. Later runs do not silently bootstrap: they may drain known backlog, but cannot claim caught-up freshness. Automatic recovery, including mapped-obligation scans, is the next chunk. Do not clear state or delete mappings to bypass this gap.

Preview, manual ingestion and legacy checkpoint contracts remain unchanged. The `primary` namespace assumes one configured Gmail account; changing accounts needs a separate ledger/namespace migration. Follow [private evidence/retention](mail-ingestion.md): no automatic cleanup, protect unfinished jobs and treat database/backups as mailbox data. No launchd definition or recurring pilot is activated.

## Acceptance evidence

MSW covers profile/history contracts, decimal IDs beyond safe integers, all change types, pagination, malformed payloads, shared request budgets and history-only expiry. Synthetic application/compiled CLI checks cover caps, cycles, cancellation, exclusions, privacy, invalid options and resource closure. Disposable PostgreSQL covers bootstrap/history restart, mail during bootstrap, failed pages, retries without new mail, label/no-change replay, page/evidence rollback, stale generations, owner skip/loss/release and populated upgrade/failed repair. No live sync or classifier-quality result is claimed.
