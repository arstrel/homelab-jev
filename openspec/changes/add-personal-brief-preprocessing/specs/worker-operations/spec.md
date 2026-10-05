# Spec Delta

## Purpose

Operate preprocessing reliably on the existing Mac mini infrastructure with recoverable failures and protected credentials.

## ADDED Requirements

### Requirement: Operational state is separate from user task authority
The system SHALL use the existing PostgreSQL deployment for checkpoints, classifications, source links, corrections, and write/retry records without altering unrelated homelab data. Todoist SHALL remain authoritative for task content, placement, and completion.

#### Scenario: Cache disagrees with Todoist
- **WHEN** a cached project assignment differs from the user's current Todoist assignment
- **THEN** reconciliation follows Todoist and retains the user correction

### Requirement: Recoverable processing
The system SHALL prevent overlapping write execution, retain failed work, retry transient failures with bounded backoff, and expose persistent failures without claiming success. Stopping or restarting the worker SHALL preserve replay safety.

#### Scenario: Provider rate limit
- **WHEN** Jev, Google, or Todoist temporarily rate-limits a request
- **THEN** the work remains pending, retries respect provider guidance, and diagnostics expose its status

### Requirement: Independent protected credentials
The worker SHALL use independently authorized Google and Todoist credentials and the configured Jev key. Secrets SHALL NOT appear in tracked files, logs, artifacts, or evaluation fixtures. Hosted model context SHALL be limited to the source information needed for the judgment.

#### Scenario: Authentication fails
- **WHEN** a provider rejects a credential
- **THEN** diagnostics identify the provider and recovery action without revealing the credential or raw email body

### Requirement: Observable phased activation and rollback
The system SHALL support an observation mode that proposes classifications without Todoist or Gmail writes, followed by explicit activation of task capture and brief integration. Diagnostics SHALL expose synchronization, pending jobs, write failures, and snapshot publication status. Rollback SHALL preserve user tasks and source mappings.

#### Scenario: Observation pilot
- **WHEN** the worker runs in observation mode
- **THEN** classifications can be reviewed while Todoist and Gmail remain unchanged

#### Scenario: Worker disabled
- **WHEN** preprocessing is disabled during rollback
- **THEN** existing Todoist tasks and Drive artifacts remain usable and mappings are retained for safe resumption
