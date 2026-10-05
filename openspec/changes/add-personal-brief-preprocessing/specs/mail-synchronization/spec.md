# Spec Delta

## Purpose

Keep email preprocessing current through incremental mailbox synchronization without requiring Gmail push notifications.

## ADDED Requirements

### Requirement: Five-minute polling
The system SHALL check Gmail for changes every five minutes while the worker host and required services are available. It SHALL record the last successful synchronization separately from attempted runs.

#### Scenario: No new mail
- **WHEN** a scheduled poll finds no relevant changes
- **THEN** synchronization freshness advances without repeating Jev evaluations or creating tasks

#### Scenario: Host becomes available
- **WHEN** the worker resumes after an interruption
- **THEN** it checks for accumulated changes and reports actual freshness rather than claiming uninterrupted operation

### Requirement: Incremental ingestion and recovery
The system SHALL bootstrap a configured recent-mail window, process all available incremental history pages, and retain failed processing work for retry. An expired history checkpoint SHALL trigger recovery that includes threads linked to open obligations.

#### Scenario: Cursor expires
- **WHEN** Gmail rejects the saved history checkpoint as expired
- **THEN** the worker performs recovery and preserves existing source-to-task links

#### Scenario: Classification fails after ingestion
- **WHEN** a fetched change cannot yet be classified
- **THEN** the change remains pending even if later mailbox history has been ingested

### Requirement: Incoming and sent thread context
The system SHALL process relevant incoming messages, sent replies, and changed threads independently of unread status. It SHALL retrieve sufficient thread evidence for an obligation judgment.

#### Scenario: User replies
- **WHEN** a sent reply is added to a thread linked to a reply-needed task
- **THEN** the reply is available as evidence for evaluating a transition to waiting or resolution review

### Requirement: Source replay does not create new work
The system SHALL recognize previously ingested messages and distinguish substantive new evidence from read-state or label-only changes.

#### Scenario: Email is marked read
- **WHEN** a processed message receives only a read-state change
- **THEN** no new obligation is created solely from that change
