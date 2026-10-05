# Spec Delta

## Purpose

Operate preprocessing reliably on the existing Mac mini infrastructure with recoverable failures, protected credentials, reproducible verification, and reviewed releases.

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

### Requirement: Reproducible offline verification
The project SHALL provide a full, non-mutating offline verification command using pinned tools and locked dependencies. It SHALL check formatting/linting, types, offline behavior, production compilation/startup, and specifications without personal credentials or external provider access.

#### Scenario: Developer verifies a clean checkout
- **WHEN** the developer installs locked dependencies and runs offline verification without a secret file
- **THEN** all offline checks execute, unexpected provider requests fail, and checked source/configuration remains unchanged

### Requirement: Commit checks cover staged content
The pre-commit gate SHALL run full offline verification only when all validation inputs are fully staged. Partial staging, unstaged tracked inputs, relevant non-ignored untracked files, and mutations during checks SHALL block the commit with actionable diagnostics. The gate SHALL NOT automatically stash, stage, or fix files.

#### Scenario: Partially staged application file
- **WHEN** the staged application file differs from the version the offline checks would read
- **THEN** the commit is blocked before validation and the developer receives staging instructions

#### Scenario: Untracked test changes verification
- **WHEN** a non-ignored untracked test file can affect the validation suite
- **THEN** the commit is blocked until the checked input set matches the staged content

### Requirement: Database and pull request gates
Pre-push and required PR CI gates SHALL verify offline behavior and PostgreSQL integration against disposable test databases without loading operational credentials. The pre-push gate SHALL reject content that differs from its pushed target. CI SHALL report checks for its checked-out revision, and failed required checks SHALL block merge.

#### Scenario: Database constraint regression
- **WHEN** a pushed change fails a PostgreSQL replay or uniqueness test
- **THEN** local pre-push fails and required CI independently reports a failure that prevents merge

#### Scenario: Push targets another revision
- **WHEN** the local checked content does not match a pushed target commit
- **THEN** the pre-push gate blocks instead of reporting the target as tested

### Requirement: Reviewed release isolation
Production SHALL run a compiled release from a reviewed commit with its runtime and revision recorded, independently of the editable checkout. Schema changes SHALL be applied explicitly. Code rollback SHALL check schema compatibility and preserve user tasks and replay records.

#### Scenario: Development checkout changes
- **WHEN** source files or dependencies are edited in the development checkout
- **THEN** the active scheduled worker continues to run its installed release until an explicit release switch

#### Scenario: Previous release requires an incompatible schema
- **WHEN** a code rollback would require a schema that is no longer compatible
- **THEN** the rollback is blocked pending the documented recovery procedure rather than destructively reversing data automatically
