# Spec Delta

## Purpose

Let the operator turn a small sample of complete stored email conversations into explicitly reviewed tasks in existing Todoist projects.

## ADDED Requirements

### Requirement: Bounded reviewable proposals
Preview SHALL inspect at most ten stored complete conversations and ask Jev finite action/destination questions. Each proposal SHALL use a source sentence as its title and show the existing project and Gmail link. Non-actions/unknown actions SHALL produce no task. Preview SHALL save a private file and SHALL NOT create Todoist tasks.

#### Scenario: Action with uncertain routing
- **WHEN** Jev selects a supported action but cannot choose a themed destination
- **THEN** the proposal uses the current Inbox project

### Requirement: Explicit selected creation
Apply SHALL require a review file and explicit candidate numbers. It SHALL validate source fingerprint, source-derived title and current destination before creation. Retro SHALL be excluded by name and any configured/captured identity. Changed evidence or destination SHALL require another preview. Apply SHALL NOT call Jev.

#### Scenario: Evidence changed after preview
- **WHEN** the stored conversation fingerprint differs from the proposal
- **THEN** no task is created for that stale proposal

### Requirement: Small replay-safe creation ledger
The workflow SHALL create at most one task per conversation in this slice, retain a Gmail link and record the returned task ID. Reapplying linked work SHALL skip creation. Remote writes SHALL follow a saved stable intent/request identity; uncertain outcomes SHALL remain unresolved without automatic recreation. Existing user tasks SHALL NOT be updated or completed.

#### Scenario: Todoist response is lost
- **WHEN** a create outcome is unknown
- **THEN** subsequent apply reports manual reconciliation needed without another create request

#### Scenario: Apply is repeated
- **WHEN** the unchanged reviewed conversation is already linked
- **THEN** apply returns the existing task identity without creating a duplicate
