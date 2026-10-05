# Spec Delta

## Purpose

Turn relevant email context into inspectable typed judgments that support attention filtering, obligation matching, and project routing.

## ADDED Requirements

### Requirement: Separate typed judgments
The system SHALL obtain separate Jev judgments for message kind, attention required, obligation matching, lifecycle evidence, and project routing. Outputs SHALL include the available probability and confidence fields and support unknown or none outcomes.

#### Scenario: Important automated notification
- **WHEN** an automated account notice requires the user's attention
- **THEN** it can be classified as both a notification and actionable rather than being excluded because it is automated

### Requirement: Restricted decision context
The system SHALL evaluate email as source data against trusted criteria and a bounded set of candidate tasks and allowed destinations. Exact arithmetic and date comparisons SHALL be performed outside Jev.

#### Scenario: Email requests arbitrary routing
- **WHEN** an email includes instructions to create a project outside the allowed destinations
- **THEN** that text cannot introduce a destination or bypass the task policy

### Requirement: Uncertainty controls capture
The system SHALL use configurable, separately evaluated thresholds for action detection, matching, and routing. It SHALL withhold unsupported automatic actions and expose uncertain actionable candidates for review.

#### Scenario: Unclear destination
- **WHEN** an actionable candidate has no sufficiently certain themed-project match
- **THEN** it is captured once for review in Todoist Inbox with source evidence

#### Scenario: Informational message
- **WHEN** a message provides useful information without a concrete user action
- **THEN** it can enter the digest context without creating a Todoist task

### Requirement: Evaluation and corrections
The system SHALL retain the model and decision-policy versions with results and accept user corrections. Before automatic task capture is enabled, an evaluation report SHALL describe missed actions, incorrect captures, routing errors, review rate, latency, and cost on representative corrected examples.

#### Scenario: Project classification is corrected
- **WHEN** the user changes a proposed routing decision
- **THEN** the correction is retained separately from the original model result and is available for subsequent evaluation
