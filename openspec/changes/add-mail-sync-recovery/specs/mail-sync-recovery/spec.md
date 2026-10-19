# Spec Delta

## Purpose

Restore bounded Gmail evidence discovery after history expiry while retaining durable work and the identity of mapped obligations.

## ADDED Requirements

### Requirement: Automatic bounded recovery
The sync command SHALL recover an expired history anchor using a fresh anchor, a fixed recent window and all locally mapped conversations, then catch up changes received during recovery. Recovery SHALL obey the existing deadline, request and discovery-step limits.

#### Scenario: Mail arrives during recovery
- **WHEN** a message arrives after the new anchor is captured while recovery scans are in progress
- **THEN** history catch-up queues that message before discovery is reported caught up

#### Scenario: A renewed anchor expires
- **WHEN** history expires again during recovery catch-up
- **THEN** recovery restarts without losing durable work and stops when invocation limits are reached

### Requirement: Durable recovery progress
Recovery SHALL resume committed scan progress after interruption. Its mapped inventory SHALL be snapshotted durably and paginated, including threads older than the recent window.

#### Scenario: Restart between mapped pages
- **WHEN** a run stops after committing a mapped page
- **THEN** the next run resumes the remaining snapshot without skipping a mapped conversation

### Requirement: Preserve known work and identity
Recovery SHALL preserve evidence versions, jobs, mappings, suppressions and pending retrievals. Moving the recent window SHALL NOT exclude previously queued work. Failed initialization or page persistence SHALL leave its state and queued work unchanged.

#### Scenario: Old pending mail and missing mapped mail
- **WHEN** older pending mail falls outside the recovery window and a mapped thread is missing remotely
- **THEN** the old pending mail remains eligible and the missing thread does not remove mappings or complete tasks

### Requirement: Honest recovery freshness
Reports SHALL identify the bounded recovery scope and unreplayed history gap without exposing mail or provider identifiers. Evidence freshness and recovery completion SHALL advance only after history catch-up and a drained retrieval backlog.

#### Scenario: Partial mapped evidence
- **WHEN** discovery catches up but a mapped thread has incomplete bodies
- **THEN** recovery remains incomplete with retryable work and the previous evidence freshness timestamp

#### Scenario: Successful bounded recovery
- **WHEN** history is caught up and all retrieval work is acknowledged
- **THEN** scoped evidence is complete and the unreplayed history gap remains visible
