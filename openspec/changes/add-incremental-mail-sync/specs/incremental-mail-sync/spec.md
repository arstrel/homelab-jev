# Spec Delta

## Purpose

Collect Gmail changes incrementally without losing retrieval work or claiming that discovery progress means complete evidence processing.

## ADDED Requirements

### Requirement: Resumable bootstrap and history
The system SHALL bootstrap a fixed recent-mail window across bounded runs, then follow all history pages from a saved anchor. Mail arriving during bootstrap SHALL remain discoverable through subsequent history. Limits and failed pages SHALL preserve resumable progress without claiming catch-up.

#### Scenario: Bootstrap interrupted
- **WHEN** a run stops after one committed bootstrap page
- **THEN** another run resumes the same window and next page

#### Scenario: Mail during bootstrap
- **WHEN** incoming or sent mail arrives after the bootstrap anchor
- **THEN** history catch-up discovers it without a new recent-window scan

#### Scenario: Later history page fails
- **WHEN** a history page fails after earlier pages committed
- **THEN** earlier work survives and the failed page remains the next discovery attempt

### Requirement: Atomic discovery backlog
The system SHALL commit deduplicated retrieval work before advancing discovery progress. Partial or failed retrievals SHALL remain durable and retryable independently of further mailbox changes.

#### Scenario: Queue persistence fails
- **WHEN** a discovered page cannot be saved completely
- **THEN** neither its cursor progress nor its partial queue writes commit

#### Scenario: Partial body and restart
- **WHEN** one conversation remains partial while discovery catches up
- **THEN** the conversation remains pending and is retried when due even if no new mail arrives

### Requirement: Exact evidence acknowledgement
The system SHALL acknowledge retrieval work in the same transaction that saves complete evidence and its exact-bound processing job. Replay and observation-only changes SHALL preserve existing deduplication guarantees.

#### Scenario: Persistence fails before acknowledgement
- **WHEN** evidence/job persistence fails
- **THEN** retrieval work remains pending and prior versions remain intact

#### Scenario: Label-only replay
- **WHEN** a discovered change affects labels or read state only
- **THEN** observations can update without another evidence version or classification job

#### Scenario: Removed or excluded conversation
- **WHEN** retrieval confirms a missing conversation or a draft-only/Spam/Trash conversation
- **THEN** the retrieval item can be acknowledged with a visible outcome without deleting old evidence or changing user tasks

### Requirement: Exclusive mailbox ownership
The system SHALL prevent overlapping synchronization commands from owning the same mailbox. Loss of ownership SHALL prevent later checkpoint or acknowledgement commits.

#### Scenario: Overlapping command
- **WHEN** another command owns mailbox synchronization
- **THEN** the new command reports a skipped run without provider calls or progress writes

#### Scenario: Owning connection closes
- **WHEN** the database connection holding ownership is lost
- **THEN** outstanding reads are cancelled and that connection cannot commit later synchronization changes

### Requirement: Separate freshness and explicit gaps
The system SHALL distinguish discovery catch-up from complete evidence freshness. A no-change successful run SHALL refresh observation time without Jev calls or duplicate jobs. Pending retrievals, caps and provider failures SHALL remain visible.

#### Scenario: No-change run
- **WHEN** history is exhausted and no retrieval work remains
- **THEN** successful evidence freshness advances with zero new jobs

#### Scenario: Discovery ahead of evidence
- **WHEN** history is exhausted but retryable evidence remains
- **THEN** discovery can be current while complete evidence freshness does not advance

### Requirement: Recovery-required history expiry
The system SHALL preserve saved data and report recovery-required when Gmail rejects an expired history anchor. It SHALL not silently reset the cursor or claim successful synchronization.

#### Scenario: Expired cursor
- **WHEN** history retrieval returns an expired-anchor response
- **THEN** automatic discovery stops with a nonzero recovery-required report and existing work/mappings remain

### Requirement: Bounded private manual operation
The system SHALL validate options/configuration before side effects, bound discovery/retrieval, sanitize output and release resources on exit. It SHALL not schedule itself, migrate automatically, classify mail or write remote providers.

#### Scenario: Cancellation or limit
- **WHEN** cancellation, deadline or a run cap stops progress
- **THEN** committed work remains resumable and output reports the unfinished state without private identifiers or errors

#### Scenario: Invalid command
- **WHEN** options or required configuration are invalid
- **THEN** no provider request or database write occurs
