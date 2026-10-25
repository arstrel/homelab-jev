## Purpose

Retrieve ordinary nested HTML email bodies completely while retaining truthful evidence coverage and bounded parsing.

## ADDED Requirements

### Requirement: Independent bounded HTML layout depth

The reader SHALL support ordinary HTML layouts deeper than MIME nesting limits and retain independent depth, child-count and byte bounds. It SHALL preserve explicit partial coverage when any parsing or retrieval bound is exceeded.

#### Scenario: Ordinary nested layout
- **WHEN** an HTML email has 25 nested layout elements within byte limits
- **THEN** its full normalized text is eligible for complete evidence ingestion

#### Scenario: Actual truncation
- **WHEN** HTML exceeds its DOM depth, child-count or byte bounds
- **THEN** the message remains partial and queued for retrieval rather than silently classified

### Requirement: Complete MIME alternative fallback

The reader SHALL retain plain-text preference when valid and use a complete HTML MIME alternative if preferred plain text fails coverage checks. It SHALL retain mandatory mixed sections, encryption gaps and all byte/transport limits.

#### Scenario: Short plain representation and complete HTML
- **WHEN** preferred plain data is shorter than its declared size and an HTML alternative is complete
- **THEN** the complete alternate representation supplies evidence without accepting the short plain body

#### Scenario: Both alternatives incomplete
- **WHEN** neither MIME alternative meets coverage requirements
- **THEN** evidence remains partial and pending
