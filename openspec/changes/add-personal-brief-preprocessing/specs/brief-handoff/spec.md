# Spec Delta

## Purpose

Provide fresh, source-linked preprocessing context to existing daily briefs while keeping Todoist authoritative for live tasks.

## ADDED Requirements

### Requirement: Dedicated readable snapshot
The system SHALL publish a dedicated Markdown snapshot to Google Drive with a generation identifier, publication time, last successful Gmail and Todoist synchronization times, pending failures, new actions, waiting items, review candidates, and resolution suggestions. Items SHALL link to available source messages and Todoist tasks.

#### Scenario: New action published
- **WHEN** a successfully processed batch adds a task
- **THEN** the current snapshot references the task and supporting email with truthful source timestamps

### Requirement: Actual retrieval and freshness checks
Before the handoff is enabled, both scheduled tasks SHALL demonstrate current-generation snapshot retrieval and live Todoist access. Each run SHALL evaluate freshness against a configurable cutoff and explicitly identify stale or unavailable inputs, using connected-source fallback when available.

#### Scenario: Worker is offline
- **WHEN** the scheduled task reads a snapshot older than the freshness cutoff
- **THEN** it reports the stale preprocessing state and uses available live sources instead of treating cached obligations as current

#### Scenario: Publication fails
- **WHEN** processing succeeds but Drive publication fails
- **THEN** the prior snapshot keeps its original generation and freshness data until a new publication succeeds

### Requirement: Calendar-block-aware planning
Daily Life Plan SHALL combine current Todoist inventory, upcoming Calendar blocks, Retro feedback, and relevant Drive context. Recommendations SHALL fit block theme and available time, treat optional inventory as optional, and exclude waiting items from work the user can perform immediately.

#### Scenario: Home and Admin block
- **WHEN** a bounded Home & Admin block is upcoming
- **THEN** the planner selects fitting actionable items from that project rather than presenting the entire cross-project backlog

### Requirement: Separate artifact ownership
The worker SHALL update only its dedicated handoff artifacts. Existing plans, digests, and retrospectives SHALL remain planner-owned. Generated briefs SHALL NOT be ingested as independent evidence of task completion.

#### Scenario: Yesterday's plan mentions a task
- **WHEN** a prior generated plan says an action was scheduled
- **THEN** the system does not treat that text alone as proof the action was completed
