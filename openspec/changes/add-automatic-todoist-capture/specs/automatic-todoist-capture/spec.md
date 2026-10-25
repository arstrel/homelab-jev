## Purpose

Capture a bounded number of useful recent email obligations into existing Todoist projects while matching known work and preserving user ownership.

## ADDED Requirements

### Requirement: Explicit bounded automatic admission
The system SHALL require explicit enablement and a source-time boundary, examine at most five current conversations per cycle, and admit at most three new Todoist creation intents in a rolling 24-hour window. Shared lifetime inference admission SHALL precede hosted calls.

#### Scenario: Historical backlog or exhausted cap
- **WHEN** source evidence predates enablement or the creation allowance is exhausted
- **THEN** no new task is created for that source and capped work remains deferred

### Requirement: Matching before creation
The system SHALL prefer durable mappings and exact Gmail references before bounded typed matching against current open and recent completed tasks. Incomplete inventory, ambiguous matches, unknown judgments or insufficient confidence SHALL prevent automatic creation.

#### Scenario: Existing or completed work
- **WHEN** a supported existing-task match is found
- **THEN** the source is linked locally without creating, editing or reopening a remote task

### Requirement: Concrete source-supported tasks
The system SHALL create only confidently required finite obligations with source-supported titles, live allowed themed destinations and Gmail provenance. It SHALL exclude Retro, owner-rule notifications, FYI/noise, waiting/resolved and uncertain obligations.

#### Scenario: Useful new action
- **WHEN** recent complete evidence establishes a clear new obligation with confident allowed routing and no known duplicate
- **THEN** one source-linked task is created in the existing project

### Requirement: Preserve manual task ownership and safe replay
The system SHALL preserve existing task fields and completed/deleted mapped obligations. It SHALL recheck evidence and inventory before creation and preserve ambiguous intents rather than blindly retrying uncertain writes.

#### Scenario: Edited or completed mapped task
- **WHEN** the user changes or completes/deletes a mapped task and mail is replayed
- **THEN** the worker neither overwrites fields nor recreates the task

#### Scenario: Lost create response or changed inventory
- **WHEN** creation is ambiguous or evidence/inventory changed after judgment
- **THEN** replay does not blindly create a new task
