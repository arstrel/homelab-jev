# Spec Delta

## Purpose

Bring recent user-authored Retro feedback into the existing planning brief, with typed, source-linked review suggestions that preserve task meaning and human control.

## ADDED Requirements

### Requirement: Bounded recent feedback
The brief SHALL read recent Retro tasks and comments, including recently completed entries, within a stated source window and fixed bounds. Retro SHALL remain outside actionable task inventory. Missing identity, failed reads, undated data and truncated coverage SHALL be explicit rather than reported as an empty successful read.

#### Scenario: Feedback entry has been completed
- **WHEN** a recent Retro task is completed in Todoist
- **THEN** it can still appear as feedback, without being recreated or re-opened

### Requirement: Finite typed review
An explicit review option SHALL use validated finite Jev choices for task kind, task candidate, relation and supporting source excerpt. Choices SHALL be limited to supplied current tasks/evidence. Unknowns, low confidence, invalid answers and incomplete inputs SHALL remain review or unavailable cases. Source text SHALL NOT supply executable instructions or invented task IDs.

#### Scenario: Broad remote-setup accomplishment
- **WHEN** feedback describes remote access setup while several setup tasks remain open
- **THEN** only a specifically supported candidate is suggested for review, or uncertainty is retained

### Requirement: Preserve task kinds
The brief SHALL distinguish finite actions, reusable activity options, broad goals and unknown kinds. Completion feedback SHALL NOT consume a reusable option or imply that a broad goal is finished. Suggestions SHALL retain task/source links, bounded evidence, confidence and model/policy identity.

#### Scenario: Rowing session
- **WHEN** feedback records rowing and the current task represents a reusable rowing option
- **THEN** the brief records activity while keeping the option available for future planning

### Requirement: Human-controlled effects and spending
This feature SHALL NOT mutate Todoist tasks, Retro entries, Gmail, scheduled prompts or the collector. Review requests SHALL share the explicit command inference cap and existing timeout/cancellation policy. Normal context publication SHALL make no additional Retro model calls; failed or disabled interpretation SHALL be visible.

#### Scenario: Context-only publication
- **WHEN** the command runs without the review option
- **THEN** recent feedback is published with interpretation marked not requested and no Retro inference
