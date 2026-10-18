# Manual durable mail ingestion

Build with the pinned runtime, explicitly apply reviewed migrations, then ingest a bounded sample:

```sh
nvm use
npm run build
npm run db:migrate
npm run mail:ingest -- --days 30 --max-threads 20
```

Migration and ingestion write to the database selected by ignored `.env`. Review [migration operations](migrations.md) and verify that target privately before using these commands. This feature's implementation/testing does not apply migrations to, or ingest mail into, the operational database. Tests use synthetic email and disposable PostgreSQL.

Configuration requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` with `gmail.readonly`, plus `DB_URL` or all the documented `DB_*` fields. No Jev, Todoist or Drive credentials are required. The existing `mail:preview` remains Google-only and never writes the database. Ingestion never migrates on startup.

## Persistence and reruns

Ingestion reuses [preview retrieval](gmail-preview.md): fixed recent window, read/archived/incoming/sent discovery, full older context, no drafts, metadata-only document attachments, and explicit partial bodies. Defaults and limits are unchanged. It retrieves before opening a persistence transaction. Complete eligible conversations are saved atomically with jobs under queue policy `obligation-triage/v1`; this is an initial queue identity, not a selected/measured classifier model.

`jev.mail_evidence_versions` holds immutable normalized JSONB payloads keyed by mailbox/thread/fingerprint. Jobs reference the exact version through a composite foreign key and equality constraint. New replies preserve old versions; read/label/observation changes do not create new versions or jobs. The latest observation is separate on the source row; older observations cannot replace newer timestamps. That timestamp is not a Gmail revision order guarantee.

A statement failure rolls back the entire bounded batch. If the connection is lost while acknowledging commit, the outcome can be unknown: zero reported counters mean no confirmed result, not proof that nothing committed. Rerunning safely deduplicates evidence/jobs after an interrupted or lost response. Existing pre-migration jobs report missing evidence; only recovery of their exact fingerprint can bind them, preserving attempts and completion state. Looking up an old job never silently substitutes the latest conversation. No classifier consumes jobs yet.

Partial/failed conversations receive no evidence version or classification job. They are reported for another attempt and retried only if selected on a later manual run. There is no durable retry queue for retrieval failures, no checkpoint advancement, no history recovery, and no synchronization-freshness claim. A capped sample cannot establish full mailbox coverage. Those behaviors belong to the next synchronization change.

## Output and exit status

Only JSON counts, window bounds, fixed reasons and status values are printed. `persistence` reports complete eligible threads, actual inserted versions/jobs, exact recovered legacy bindings and reused versions. `persistence.status` is `committed`, `not-needed`, `failed` or `cancelled`. Persistence failure reports zero committed counters and reason `persistence-error`. `checkpointAdvanced` is always false. `downstreamWrites: 0` refers to remote Gmail/Jev/Todoist/Drive effects; PostgreSQL writes are explicitly reported separately.

Exit `0` means exhausted discovery, complete body coverage and successful/no-needed persistence. Exit `2` means a successfully persisted sample was limited only by the thread cap. Exit `1` covers invalid configuration/options, retrieval/coverage failures or persistence failure. Complete evidence may commit even while other conversations are partial, so exit `1` does not imply all database counts are zero. Never print or export subjects, bodies, addresses, source IDs, fingerprints or raw provider/SQL errors.

SIGINT/SIGTERM cancels outstanding reads and prevents starting persistence. An already committing bounded transaction completes or rolls back; the process closes the pool before exiting nonzero. A committed batch is safe to replay. Existing database connection/statement timeouts remain active. Retrieval limits bound batch size, but the retrieval deadline is not a whole-command database transaction timeout.

## Private data and retention

The PostgreSQL payload now includes real message text, headers and attachment metadata when the operator runs ingestion. Treat database access and backups as private mailbox data. Keep them outside this repository and OKF. Attachment contents remain unread. This is processing evidence for reproducible jobs, not a second task UI.

There is no automatic garbage collection in this slice. Retain evidence referenced by jobs; foreign keys block deletion while references exist, including completed jobs. Before a larger ongoing pilot, agree a retention policy and add reviewed cleanup that protects unfinished work. Do not delete versions or truncate tables as a rerun procedure. The current `primary` namespace assumes one configured Gmail account; switching accounts requires a separate ledger/namespace migration.

## Acceptance evidence

Synthetic unit tests cover malformed/partial storage inputs, isolated snapshots, mixed coverage, privacy, validation before side effects, cancellation and pool closure. Disposable PostgreSQL tests cover concurrent replay, policy identity, old/new payload lookup, rollback after version insertion, immutable updates, exact FK bindings, referenced-version retention and legacy recovery. The populated upgrade test exercises the prior two migrations, failed third-migration rollback/repair and preserved jobs/classifications/mappings/suppressions/checkpoints. The full gate includes the unchanged preview transport and offline CLI checks. Credentialed operational ingestion is deliberately left for explicit activation after merge; no live persistence success is claimed.
