# Spec Delta

## Purpose

Use user-authored retrospective feedback to inform daily planning while preserving the meaning of finite tasks, activity options, and goals.

## ADDED Requirements

### Requirement: Retro remains user-authored feedback
The system SHALL read Retro as feedback context and SHALL NOT route email tasks into it or rewrite its entries. Existing retrospective artifact and archive behavior SHALL remain under the daily planner's ownership.

#### Scenario: Homelab accomplishment is recorded
- **WHEN** the user records a completed setup activity in Retro
- **THEN** it is available as feedback without being converted into a new email-derived task

### Requirement: Specific feedback supports reconciliation
The system SHALL associate explicit completion feedback with candidate tasks and expose evidence-based reconciliation suggestions. It SHALL preserve uncertainty when the feedback does not identify which steps were completed.

#### Scenario: Broad setup report
- **WHEN** Retro says a remote connection was established while several setup tasks remain open
- **THEN** the planner receives candidate matches without assuming all setup tasks were completed

### Requirement: Preserve task kinds
The planning integration SHALL distinguish finite actions, reusable activity options, and broad goals. Recording one session SHALL NOT consume a reusable option, and a broad goal SHALL inform selection of concrete next steps.

#### Scenario: Rowing session recorded
- **WHEN** Retro records a rowing workout
- **THEN** the reusable rowing option remains available for later suitable calendar blocks

#### Scenario: Long-term study goal
- **WHEN** the inventory includes a certification goal and a study block is available
- **THEN** the planner proposes a bounded next study action rather than claiming the entire goal fits in the block
