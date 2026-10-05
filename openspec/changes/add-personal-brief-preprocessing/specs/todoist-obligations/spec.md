# Spec Delta

## Purpose

Keep actionable obligations visible in existing Todoist projects while preserving user ownership and preventing duplicate task creation.

## ADDED Requirements

### Requirement: Existing project routing
The system SHALL route confidently actionable new obligations to allowed active themed Todoist projects using their descriptions. Retro SHALL be excluded from email-task destinations, and Inbox SHALL receive actionable candidates needing review.

#### Scenario: Household obligation
- **WHEN** a new paperwork action confidently matches Home & Admin
- **THEN** it is added to that existing project with a concrete title and source link

#### Scenario: Destination becomes unavailable
- **WHEN** a configured themed project is archived or removed
- **THEN** the system refreshes destinations and routes unresolved actionable candidates to review without recreating the project

### Requirement: Evidence-based matching before creation
The system SHALL match new evidence to existing obligations before adding tasks. It SHALL support multiple obligations within one thread and evidence from multiple threads for one task.

#### Scenario: Follow-up on an existing request
- **WHEN** a later message refers to an already tracked obligation
- **THEN** the existing task gains relevant evidence rather than a duplicate task

#### Scenario: Independent request in the same thread
- **WHEN** a thread introduces a distinct concrete action
- **THEN** the system can capture a separate obligation instead of suppressing it solely because the thread is already mapped

### Requirement: Replay-safe remote writes
The system SHALL ensure that retries, concurrent runs, and uncertain remote responses do not create duplicate obligations. It SHALL reconcile an ambiguous task-creation outcome before attempting another creation.

#### Scenario: Response lost after creation
- **WHEN** Todoist creates a task but the worker loses the response
- **THEN** a retry finds and links the existing task or records an unresolved write rather than blindly creating another

### Requirement: Manual Todoist changes are authoritative
The system SHALL preserve user edits to content, project, dates, descriptions, and labels. It SHALL respect user completion or deletion and prevent replay of the same source obligation from recreating that task. Automatic updates SHALL be limited to mapped tasks and worker-owned evidence.

#### Scenario: User moves a generated task
- **WHEN** the user moves a managed task from Technical & Career to Personal Projects
- **THEN** later synchronization preserves the new project and records the correction

#### Scenario: Completed task is reprocessed
- **WHEN** an old email supporting a user-completed task is processed again
- **THEN** the same obligation remains suppressed from automatic creation

### Requirement: Lifecycle state and resolution suggestions
The system SHALL expose actionable, waiting, and review states using Todoist-visible metadata. Email-inferred resolution SHALL be a sourced suggestion and SHALL NOT automatically complete a task in the first release. Due dates SHALL require explicit source evidence or user input.

#### Scenario: Approval is not completion
- **WHEN** a PR notification states approval without evidence of merge
- **THEN** the system does not complete the associated review obligation solely from approval

#### Scenario: Reply is sent
- **WHEN** a reply satisfies the user's immediate response obligation but a response is still expected
- **THEN** the task can be marked waiting and excluded from immediate-action recommendations
