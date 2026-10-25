# Spec Delta

## Purpose

Keep the private planning context current and let existing scheduled routines consume it with explicit freshness, source authority and fallback behavior.

## ADDED Requirements

### Requirement: Recurring source refresh without inference
The publisher SHALL refresh the same owned private Drive file every five minutes while the mini is awake and logged in. Scheduled refresh SHALL use saved email judgments and current Todoist/Retro sources, make zero hosted Jev requests, preserve source gaps and leave the collector independent.

#### Scenario: Unclassified email in a refresh
- **WHEN** selected email has no exact saved judgment
- **THEN** the published brief identifies the capped/uncertain case without sending it to Jev or implying the inbox is empty

### Requirement: Additive reversible prompt handoff
Existing daily routine prompts SHALL be backed up privately before an additive handoff is applied. Existing schedules, original instructions and permissions SHALL remain unchanged. Each run SHALL fetch the exact Drive file anew and record generation, publication time and source coverage in its existing Run record.

#### Scenario: Prompt rollback
- **WHEN** the handoff is disabled
- **THEN** the saved original prompt can be restored without deleting the Drive file, ledger or user tasks

### Requirement: Independent freshness and live authority
Consumers SHALL label publications older than 15 minutes, future-dated, missing or unreadable as stale/unavailable and continue with the existing direct-source routine. Fresh publication SHALL NOT imply complete source coverage. Current Todoist and Calendar state SHALL govern task availability and block fitting; model suggestions SHALL NOT establish completion or authority.

#### Scenario: Fresh file with incomplete Gmail collection
- **WHEN** generation is recent but evidence freshness is unknown or coverage is partial
- **THEN** the routine records that gap, uses bounded direct checks when needed and does not claim complete inbox coverage

### Requirement: Distinguish verification surfaces
Acceptance evidence SHALL distinguish manual chat probes, scheduler test runs and clock-triggered daily execution. Timer-triggered acceptance SHALL remain pending until observed with actual input generation and live-source results.

#### Scenario: Daily timer has not fired
- **WHEN** prompt installation succeeds before the next daily schedule
- **THEN** installation is recorded separately and a follow-up verifies the actual timer run without claiming it has already passed
