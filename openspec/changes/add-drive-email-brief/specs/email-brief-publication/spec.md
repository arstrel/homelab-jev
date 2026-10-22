# Spec Delta

## Purpose

Provide a private, source-linked email triage brief in Drive from a bounded recent sample, reusing saved judgments and disclosing incomplete collection.

## ADDED Requirements

### Requirement: Bounded recent sample
An explicit publication command SHALL select up to twenty current complete stored conversations in a configurable recent window, newest message first. It SHALL disclose the selected count, eligible stored count, window, source observations and collection gaps. It SHALL NOT imply whole-inbox coverage or advance collection freshness.

#### Scenario: Collection remains incomplete
- **WHEN** complete evidence freshness is unset or retrieval work remains
- **THEN** the brief states the gap even though its generation timestamp is recent

### Requirement: Reusable versioned judgments
Successful validated triage SHALL be saved against exact evidence, direction context, model and decision-policy identity and reused on repetition. Saving the judgment and completing its exact job SHALL be atomic. Provider or validation failures SHALL remain retryable. Owner exclusions SHALL run before hosted inference and remain visibly distinct from model judgments.

#### Scenario: Repeat publication
- **WHEN** evidence and decision inputs are unchanged
- **THEN** saved judgments are reused without a new Jev call

#### Scenario: Classification save fails
- **WHEN** the database cannot commit a successful judgment
- **THEN** the job is not marked complete independently and the command does not claim persistence

### Requirement: Templated inspectable artifact
The brief SHALL group source subjects and Gmail links into action, FYI, noise, waiting and uncertain sections, identify deterministic owner exclusions and preserve unknown/error cases. It SHALL expose model/policy identity, generation and source freshness. It SHALL NOT invent prose, deadlines, completion or task changes.

#### Scenario: Hostile subject text
- **WHEN** source text contains Markdown links, HTML or heading syntax
- **THEN** it remains escaped source data and cannot add active links or alter the report structure

### Requirement: One dedicated recoverable Drive file
Publication SHALL reserve a stable file ID durably before creation, write only its app-owned private Markdown file and verify the generation/content before recording success. A failed update SHALL retain prior successful publication metadata. Replays SHALL reuse the same ID and refuse mismatched ownership, renamed or trashed files.

#### Scenario: Create response is lost
- **WHEN** Drive accepts creation but the response is lost
- **THEN** the next explicit run resolves the reserved ID without creating a second file

#### Scenario: Existing artifact is unrelated
- **WHEN** the destination's ownership marker or expected identity does not match
- **THEN** publication stops without overwriting it or selecting another file by name

### Requirement: Explicit controlled effects
The command SHALL bound new inference attempts separately from sample size, support cached-only publication, sanitize console errors and prevent overlapping publishers. It SHALL NOT change Gmail, Todoist, scheduled prompts, file sharing or the installed collection schedule.

#### Scenario: Cached-only invocation
- **WHEN** the new-inference cap is zero
- **THEN** cached decisions are published, uncached cases remain visible, and no Jev request is made
