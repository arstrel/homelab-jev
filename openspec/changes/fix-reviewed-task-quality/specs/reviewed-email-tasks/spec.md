# Spec Delta

## Purpose

Make reviewed email task proposals represent concrete outstanding work with useful source-supported titles.

## ADDED Requirements

### Requirement: Independent obligation eligibility
Preview SHALL require an explicit outstanding-action judgment in addition to a selected sentence. FYI, promotions, optional reading, unconfirmed conditional notices and resolved/waiting work SHALL NOT produce proposals when classified as such. Semantic output SHALL NOT authorize creation.

#### Scenario: Conditional account warning
- **WHEN** a notice says to contact support only if activity was unexpected and that condition is unconfirmed
- **THEN** a conditional judgment produces no task proposal

### Requirement: Contextual source titles
Generic review-link prompts SHALL use the originating subject to form a useful review title, or be omitted if that context is unavailable. Apply SHALL recompute the permitted source-supported titles before creation.

#### Scenario: Digital letter available
- **WHEN** the supported action sentence is a generic instruction to review a letter
- **THEN** its proposal identifies the letter using its source subject rather than a context-free click instruction

### Requirement: Review policy preserves creation identity
New proposals SHALL use v2 review files and reject v1 files. Existing task mappings and ambiguous creation identities SHALL remain effective across that policy change.

#### Scenario: Old unresolved intent
- **WHEN** a new preview is approved for a conversation with a v1 ambiguous intent
- **THEN** apply does not create another task

### Requirement: Sample by conversation recency
Stored sampling SHALL prioritize newest message timestamps rather than the time older evidence was retrieved.

#### Scenario: Older mail retrieved later
- **WHEN** an old conversation is retrieved after a newer conversation
- **THEN** the newer conversation sorts first in the sample
