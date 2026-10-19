# Spec Delta

## Purpose

Expose synchronization progress without provider access and establish truthful, privacy-preserving evidence from bounded manual mailbox observations.

## ADDED Requirements

### Requirement: Read-only synchronization diagnostics
The application SHALL expose `mail:status` using database configuration only. It SHALL report one consistent observation of schema readiness, sync phase/window, discovery/evidence timestamps, recovery metadata and aggregate backlog diagnostics. It SHALL NOT mutate durable data, acquire sync ownership or contact providers.

#### Scenario: Sync is running concurrently
- **WHEN** status is requested while another invocation owns synchronization
- **THEN** status observes a consistent committed database snapshot without waiting for the sync advisory lock or changing its state

#### Scenario: No Google or Jev configuration
- **WHEN** valid database configuration is supplied without provider credentials
- **THEN** status remains usable and makes no provider request

### Requirement: Honest schema and initialization states
Diagnostics SHALL distinguish ready, migration-required, incompatible and unavailable states without applying migrations. An absent sync state in a ready schema SHALL be uninitialized, not caught up. Unavailable measurements SHALL remain unknown rather than zero.

#### Scenario: Migration is missing
- **WHEN** the database has neither managed Jev schema nor journal, or only a compatible prefix of bundled migrations
- **THEN** status reports migration-required with unavailable sync measurements and performs no setup

#### Scenario: Unrecognized migration history
- **WHEN** recorded migrations conflict with or extend beyond the bundled history
- **THEN** status reports incompatible without attempting repair

#### Scenario: Initialized schema with no sync
- **WHEN** the schema is ready but synchronization has never initialized
- **THEN** status reports an uninitialized phase and absent freshness timestamps while retaining actual aggregate ledger counts

### Requirement: Diagnostic counts preserve stage boundaries
Diagnostics SHALL distinguish all, due and retrying retrievals, future retry time, bounded failure-category counts and pending classification jobs. Status SHALL report stored observation times without promoting freshness or treating classification backlog as missing mail evidence.

#### Scenario: Discovery precedes complete evidence
- **WHEN** history has caught up but incomplete bodies remain queued for retry
- **THEN** status retains the previous evidence timestamp and reports the retrieval gap independently of classification jobs

### Requirement: Sanitized operational artifacts
Diagnostics and committed observation reports SHALL contain only reviewed fixed fields, aggregate counts, timestamps, window bounds, build identity and limitations. They SHALL exclude credentials, connection details, source/task IDs, anchors, tokens, subjects, addresses, bodies, fingerprints and raw exceptions. Unknown database failure strings SHALL NOT pass through unchanged.

#### Scenario: Unexpected stored failure text
- **WHEN** a backlog row contains an unrecognized failure value
- **THEN** diagnostics count it under a fixed unknown category without exposing its text

### Requirement: Bounded manual observation
The pilot SHALL use existing bounded manual sync invocations against an explicitly selected operational target, with documented preparation, limits and stop conditions. It SHALL preserve pending work and existing identities and SHALL NOT activate scheduling, classification or downstream provider writes.

#### Scenario: Bootstrap exceeds the pilot budget
- **WHEN** discovery or retrieval remains unfinished at the agreed run/time limit
- **THEN** the pilot stops with a resumable incomplete report instead of resetting state, dropping failures or claiming catch-up

### Requirement: Evidence controls completion claims
The report SHALL separate observed live behavior from synthetic coverage. Parent task 2.4 SHALL remain open until live catch-up and a subsequent no-change run demonstrate advancing evidence freshness with no new versions/jobs and no Jev calls. Live failure or ongoing gaps SHALL be recorded as incomplete or failed evidence.

#### Scenario: No-change verification succeeds
- **WHEN** a subsequent run discovers no references, performs no retrievals, reports complete evidence and advances the evidence timestamp without creating versions or jobs
- **THEN** the report records that observation and its zero-Jev-call command boundary

#### Scenario: Recovery is not triggered live
- **WHEN** the pilot does not encounter an expired anchor
- **THEN** recovery remains labelled synthetically tested and no live recovery claim is made
