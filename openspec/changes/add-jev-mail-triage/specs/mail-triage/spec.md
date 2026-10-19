# Spec Delta

## Purpose

Inspect bounded, typed Jev judgments over exact complete conversation evidence before enabling automatic task effects.

## ADDED Requirements

### Requirement: Exact bounded evidence selection
The command SHALL select at most the configured number of pending jobs in stable order and read each job's exact complete evidence. It SHALL NOT substitute current thread content, mutate jobs, migrate storage or retrieve Gmail. Oversized inputs SHALL be skipped explicitly without truncation.

#### Scenario: Historical job
- **WHEN** a newer version of the same conversation exists
- **THEN** preview classifies the version bound to the selected job

#### Scenario: Missing or oversized evidence
- **WHEN** selected evidence is unavailable, malformed or exceeds the classification input bound
- **THEN** the command reports a fixed failure without sending that input to Jev or changing pending work

### Requirement: Independent typed triage
Jev SHALL receive trusted criteria separately from untrusted conversation data and return independent message-kind, attention and lifecycle choices with explicit unknown outcomes. Available confidence and per-choice probabilities SHALL be validated and retained. Judgments SHALL NOT authorize tasks, routing, dates or completion.

#### Scenario: Actionable automated notification
- **WHEN** an automated notification contains a user obligation
- **THEN** its kind can remain notification while attention indicates action required

#### Scenario: Hostile source text
- **WHEN** email asks to change instructions, add a destination or complete a task
- **THEN** it stays in source data and cannot extend the allowed response values or cause a write

### Requirement: Validated provider boundary
The command SHALL reject malformed responses, out-of-range or non-finite numeric values, unsupported choices and inconsistent model identity. Calls SHALL have bounded timeout, zero automatic retries, cancellation and no SDK logging.

#### Scenario: Invalid answer
- **WHEN** a response contains an unknown choice or invalid probability
- **THEN** it yields a fixed invalid-result failure without exposing provider data or being treated as a valid judgment

### Requirement: Inspectable private preview
The report SHALL include only fixed statuses, typed choices/probabilities, policy/model identity, aggregate token usage and duration. It SHALL exclude mail text, subjects, addresses, source/job IDs, credentials and raw errors. Preview SHALL leave storage unchanged and SHALL distinguish operational failure from semantic unknown.

#### Scenario: Repeated preview
- **WHEN** preview is explicitly rerun
- **THEN** it may repeat Jev calls but does not consume jobs or create classification/task records

### Requirement: Honest evaluation boundary
The command SHALL identify the requested and returned model, version its question policy and report that results are uncalibrated. It SHALL request a supported explicit revision and reject mutable aliases. Automatic capture SHALL remain disabled until later evaluated policy and reconciliation are implemented.

#### Scenario: Alias model
- **WHEN** configuration requests a mutable model alias
- **THEN** preview rejects it and requires the documented supported revision without claiming measured classification accuracy
