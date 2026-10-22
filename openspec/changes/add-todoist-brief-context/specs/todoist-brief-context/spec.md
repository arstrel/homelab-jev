# Spec Delta

## Purpose

Show current Todoist work alongside email triage in the dedicated Drive brief, retaining source ownership and explicit coverage limits.

## ADDED Requirements

### Requirement: Current project-grouped task context
Each explicit brief publication SHALL read current active Todoist projects and open tasks within fixed bounds, group tasks by current project and show task links and existing due values. Retro SHALL be excluded by configured identity or normalized name. Task text SHALL remain escaped data; optional activities SHALL NOT become inferred obligations.

#### Scenario: Task changes between publications
- **WHEN** an existing task is renamed, moved or no longer open
- **THEN** a later successful read reflects the returned current state instead of a saved task inventory

### Requirement: Explicit source-link associations
An email action SHALL be annotated as already tracked only when an included open task description contains an exact supported primary-account Gmail conversation link. The brief SHALL retain the email and task links and disclose that this association does not prove completion or cover unreturned tasks.

#### Scenario: Similar task wording without a source link
- **WHEN** a task has similar words but no matching explicit Gmail link
- **THEN** the brief makes no already-tracked assertion from wording alone

### Requirement: Honest Todoist coverage
The brief SHALL show read start/completion times, returned task counts, truncation or missing-project gaps and fixed unavailable reasons. A failed read SHALL NOT be presented as an empty task list or reuse earlier task contents as current. Incomplete context SHALL produce a non-success command result while allowing an honest degraded brief.

#### Scenario: Later page fails
- **WHEN** Todoist fails after returning an earlier page
- **THEN** the brief marks context unavailable without presenting the earlier page as a complete inventory

### Requirement: Read-only integration
Todoist context SHALL be fetched without creating, modifying or completing tasks, without additional hosted judgments and without a new persistent task inventory. Existing email cache and dedicated Drive publication behavior SHALL remain intact.

#### Scenario: Cached-only publication
- **WHEN** the brief runs with zero new-inference allowance
- **THEN** it can refresh Todoist context and publish to the existing file without any Jev request
