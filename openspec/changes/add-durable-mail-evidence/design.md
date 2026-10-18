# Design

## Context

See [proposal](proposal.md). Preview already provides bounded, complete/partial normalized evidence. The existing ledger transaction requires a checkpoint and stores no payload. Sources and pending jobs use mailbox/source/fingerprint identity. This change adds a separate persistence port; it must not manufacture a history cursor to reuse the foundation transaction.

## Goals / Non-Goals

**Goals:** Reproducible pending inputs, atomic ingestion, safe replay, explicit legacy evidence gaps, private manual operation.

**Non-Goals:** History orchestration, cursor advancement/recovery, automatic retry scheduling, model calls, remote writes, deployment or automatic retention cleanup.

## Decisions

1. Add `mail_evidence_versions` with composite primary key `(mailbox, source_id, fingerprint)`, typed JSONB evidence, schema version and creation time. Enforce identity/coverage checks at the write boundary and reject UPDATE through a database trigger. This avoids duplicating message tables before their query needs exist. Store substantive evidence only; the latest observation is a separate nullable field on `sources`.
2. Add nullable `pending_jobs.evidence_fingerprint` with a composite FK to versions and a check that it equals the job fingerprint. Nullable preserves legacy jobs without fabricated payloads. New ingestion always supplies the binding. On a conflict with an unbound matching job, bind it without resetting attempts, availability or completion state. Lookup by job ID reports `missing-job`, `missing-evidence`, or `ready`; it never fetches latest source content instead.
3. Use a single transaction per bounded run, after all Gmail reads. Validate/snapshot complete inputs and calculate fingerprints before the transaction. Sort sources for consistent concurrent lock ordering. Upsert sources/observations without regressing a newer observation timestamp, insert versions with conflict-ignore, and insert/bind jobs using uniqueness constraints. Count actual inserted rows rather than pre-checks. SQL failure rolls back the entire batch. Replays of old evidence do not overwrite newer source observations.
4. Compose `mail:ingest` with the existing preview use case. Defaults and Google limits stay unchanged. Require DB configuration before constructing providers; no Jev/Todoist/Drive credentials. Use a fixed initial queue policy `obligation-triage/v1`, explicitly a queue identity rather than a measured classifier/model choice. No policy CLI option until classification is designed.
5. Persist complete eligible records only. Missing/partial conversations remain in sanitized coverage counts; the next manual run retries them only if discovered again. No durable retry guarantee or checkpoint is claimed. Preserve preview exit semantics (0 complete, 2 sample-only, 1 coverage/operational failure); persistence failure adds `persistence-error` with zero committed counters. Report DB counters separately from remote writes, which stay zero. SIGINT/SIGTERM cancel retrieval and prevent new persistence; an already committing bounded DB transaction finishes or rolls back, then closes its pool.
6. Do not migrate or ingest the operational DB during implementation. Exercise real Gmail transport through existing synthetic MSW tests and durable semantics through disposable PostgreSQL. Manual credentials/database storage are documented for operator activation after merge.

## Risks / Trade-offs

- [Private email text now stored in PostgreSQL] -> Explicit command only, no exports/logged payloads, document backup/access treatment and no automatic cleanup. Retain versions referenced by jobs; retention policy/GC is a subsequent reviewed change.
- [Single configured Gmail account] -> Retain the current `primary` mailbox namespace; changing accounts requires a separate ledger/namespace migration, not reuse of that identity.
- [Legacy jobs] -> Preserve gaps explicitly; exact recovered fingerprints may bind, otherwise remain unavailable. No invented backfill.
- [Concurrent observations] -> Timestamp prevents older runs replacing newer source observations; it is not a Gmail version ordering guarantee. Immutable per-job evidence remains authoritative.
- [Lost commit acknowledgement] -> Report no confirmed persistence counts and a fixed failure; the commit may have succeeded. Safe replay resolves the unknown outcome through database uniqueness, without assuming rollback after connection loss.
- [Batch transaction size] -> Existing thread/body limits bound the batch; keep all network calls outside the transaction and retain DB statement/connection timeouts.

## Migration Plan

Generate and review a new forward SQL migration and snapshot. Apply only through explicit `db:migrate`. Test fresh/repeat and upgrade from the prior two migrations with representative jobs and mappings; test failed migration rollback/repair in disposable schemas. The migration adds nullable legacy-compatible fields and tables without rewriting old payloads. A prior application release remains schema-compatible; stopping ingestion and reverting code leaves evidence intact. No down migration or destructive cleanup is automatic.
