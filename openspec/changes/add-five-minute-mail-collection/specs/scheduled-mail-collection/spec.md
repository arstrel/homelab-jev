# Spec Delta

## Purpose

Keep Gmail evidence current through a controlled five-minute native collector, while preserving explicit source gaps and the existing manual capture boundary.

## ADDED Requirements

### Requirement: Collection-only periodic execution
The installed user agent SHALL invoke bounded Gmail synchronization every 300 seconds and once at load. It SHALL retain existing pacing, exclusive database ownership and unfinished work. It SHALL NOT invoke Jev, create tasks, mutate Gmail or publish Drive context.

#### Scenario: Another sync is running
- **WHEN** a scheduled invocation overlaps a manual or scheduled synchronization
- **THEN** existing mailbox ownership makes the overlapping invocation skip without provider calls or concurrent writes

#### Scenario: Provider throttles collection
- **WHEN** Gmail returns a recognized rate-limit response
- **THEN** the batch stops, pending work remains durable, and subsequent scheduled runs respect saved retry availability

### Requirement: Reviewed isolated release installation
Installation SHALL use a clean checkout on fetched origin/main and build a versioned release from a selected ancestor commit. Runtime and revision SHALL be recorded. The agent SHALL use explicit runtime, release and private environment paths. Installation SHALL check schema readiness without applying migrations before replacing an active job.

#### Scenario: Checkout changes after installation
- **WHEN** development source or dependencies change
- **THEN** the installed collector continues using its own compiled release and production dependencies

#### Scenario: Candidate release is incompatible
- **WHEN** a candidate reports a non-ready operational schema or fails preparation
- **THEN** installation stops before replacing the active configuration and never applies a migration

### Requirement: Explicit operational control
Operators SHALL be able to install, start, stop and inspect the collector without displaying secrets. Stop SHALL disable future login activation as well as unload the current job. Status SHALL distinguish configured release, loaded job and actual source freshness. Installing a previous schema-compatible release SHALL preserve all ledger data.

#### Scenario: Stop and resume
- **WHEN** an operator stops and later starts collection
- **THEN** no evidence, cursors, jobs or mappings are deleted and pending collection resumes from durable state

#### Scenario: Agent is loaded but evidence is incomplete
- **WHEN** status observes a loaded job with unresolved retrievals
- **THEN** it reports those gaps without claiming collection acceptance or complete evidence freshness

### Requirement: Honest deployment evidence
Documentation SHALL distinguish verified tooling, manual live observations and recurring-operation acceptance. It SHALL state user-login and sleep limitations, record explicit source gaps and leave catch-up acceptance open until observed.

#### Scenario: Implementation is not merged
- **WHEN** the deployment tooling is delivered as a pull request
- **THEN** unreviewed collection code is not installed as an active production release and recurring acceptance remains pending
