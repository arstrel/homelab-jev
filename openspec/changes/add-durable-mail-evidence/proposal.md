# Proposal

## Why

Gmail preview produces normalized evidence only in memory; the ledger stores fingerprints but cannot supply the original conversation to a delayed or retried classification job. Persisting immutable evidence before classification makes later processing reproducible without introducing another task inventory.

## What Changes

- Add immutable, versioned complete mail evidence and bind new pending jobs to its exact source/fingerprint identity.
- Add atomic, replay-safe ingestion and job-evidence lookup; retain earlier versions after newer replies arrive.
- Add manual `mail:ingest` using Google and database credentials, sanitized reporting, and the preview's bounded retrieval contract.
- Add reviewed forward migration and upgrade tests that retain existing fingerprint-only jobs without inventing historical payloads.
- Document private evidence storage, retention boundaries, reruns and future synchronization handoff; update affected OKF concepts.
- Preserve preview, checkpoint state and existing task mappings. History pagination, cursor recovery, scheduling, classification and remote writes remain outside this change.

## Capabilities

### New Capabilities

- `mail-ingestion`: Durable complete evidence versions, exact job binding, atomic replay-safe persistence and manual ingestion.

### Modified Capabilities

None. The parent synchronization change remains incomplete; this delivers a prerequisite portion of its task 2.2.

## Impact

Domain/application ports, PostgreSQL schema/repositories/migrations, CLI composition, tests, runbooks and OKF. No new packages or provider scopes. Explicit migration application is required before ingestion; no operational database migration or credentialed ingestion is performed automatically during development.
