# Spec Delta

## Purpose

Preserve complete normalized Gmail evidence for reproducible pending processing, with atomic persistence and replay-safe manual ingestion.

## ADDED Requirements

### Requirement: Immutable complete evidence
The system SHALL durably retain complete normalized evidence by mailbox, source and substantive fingerprint. It SHALL reject malformed or partial evidence and preserve prior versions when newer evidence arrives.

#### Scenario: New reply while a job waits
- **WHEN** a reply produces a new evidence fingerprint
- **THEN** both versions remain available and the older job still resolves to its original evidence

#### Scenario: Partial or malformed evidence
- **WHEN** a conversation is partial or required provenance is invalid
- **THEN** no complete evidence version or classification job is saved for it

#### Scenario: Stored version mutation
- **WHEN** an update attempts to change a stored evidence version
- **THEN** the database rejects the update

### Requirement: Atomic replay-safe job binding
The system SHALL commit evidence and its pending job atomically. New jobs SHALL reference matching durable evidence. Repeated or overlapping ingestion SHALL create at most one version per source fingerprint and one job per source fingerprint and policy version.

#### Scenario: Interrupted transaction
- **WHEN** persistence fails after an evidence insert but before its job commits
- **THEN** neither that evidence nor its source/job changes are committed

#### Scenario: Concurrent replay
- **WHEN** overlapping ingestions submit the same evidence and policy
- **THEN** exactly one evidence version and one job exist

#### Scenario: Observation-only change
- **WHEN** read state, labels or observation time change without substantive evidence changes
- **THEN** no additional version or job is created

#### Scenario: Wrong evidence binding
- **WHEN** a job references evidence from a different source or fingerprint
- **THEN** the database rejects the binding

### Requirement: Existing ledger preservation
The system SHALL upgrade existing ledger data without deleting jobs, checkpoints, classifications, mappings or suppressions. Jobs lacking historical evidence SHALL remain explicitly unavailable for evidence-based processing until their exact version is recovered.

#### Scenario: Upgrade populated ledger
- **WHEN** the migration runs against a ledger containing fingerprint-only jobs
- **THEN** existing data remains and lookup reports missing historical evidence without substituting the latest conversation

#### Scenario: Exact evidence recovered
- **WHEN** ingestion obtains the exact source fingerprint of an unbound job
- **THEN** that job can bind to the recovered version without a duplicate job or resetting its state

### Requirement: Independent manual ingestion
The system SHALL expose manual bounded mail ingestion requiring only Google and database configuration. It SHALL save complete eligible conversations even in a limited sample, report incomplete coverage honestly, and leave checkpoints and remote providers unchanged.

#### Scenario: Mixed coverage sample
- **WHEN** retrieval contains complete and partial conversations
- **THEN** only complete eligible evidence is queued and the report retains partial coverage with a nonzero exit status

#### Scenario: Invalid options or configuration
- **WHEN** required configuration or command options are invalid
- **THEN** no provider requests or database writes occur

#### Scenario: Database failure
- **WHEN** atomic persistence fails
- **THEN** the command reports a fixed failure reason, no committed ingestion counts, and a nonzero exit status

#### Scenario: Preview remains read-only
- **WHEN** the existing preview command runs
- **THEN** it requires no database and performs no persistence

### Requirement: Private evidence and honest reporting
The system SHALL report only sanitized counts and fixed reasons. It SHALL keep private evidence out of terminal output, fixtures, and tracked artifacts, and document explicit migration, storage, retention and rerun behavior without claiming synchronization freshness.

#### Scenario: Sensitive provider or database error
- **WHEN** ingestion encounters an error containing private text or credentials
- **THEN** stdout and stderr omit that content, source identifiers, subjects and addresses

#### Scenario: Rerun after partial sample
- **WHEN** the operator repeats ingestion
- **THEN** complete evidence is deduplicated and partial conversations are retried only if selected again, with no claim of durable retries or mailbox synchronization
