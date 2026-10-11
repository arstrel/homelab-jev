# Proposal

## Why

The Gmail adapter currently proves authentication with a profile read but cannot retrieve the evidence needed for obligation tracking. Establish a deterministic, bounded conversation-evidence contract before adding durable synchronization, Jev decisions, or Todoist writes.

## What Changes

- Discover a configurable recent-mail window, with a proposed 30-day default, including read, archived, incoming, and sent messages; paginate and deduplicate thread identifiers.
- Retrieve full selected conversations, preserving older context and excluding drafts. Decode primary plain-text or HTML bodies, including separately stored text parts, and retain document-attachment metadata without extracting attachment contents.
- Produce versioned, typed thread evidence and separate mutable observation metadata. Represent incomplete, unavailable, unsupported, and oversized bodies explicitly.
- Calculate deterministic fingerprints from complete normalized evidence. Read-state, labels, retrieval time, and provider history identifiers do not change those fingerprints.
- Add a manually invoked `mail:preview` CLI command and npm script with validated options, bounded reads, sanitized counts, explicit completeness, and no downstream writes.
- Cover the contract with synthetic fixtures, deterministic unit/application tests, and offline Gmail transport tests; document a bounded live preview procedure.

## Capabilities

### New Capabilities

- `mail-evidence`: Bounded Gmail conversation retrieval, normalized source evidence, stable fingerprints, and truthful read-only preview reporting.

### Modified Capabilities

None. There are no archived capability specs yet. The existing [mail-synchronization proposal](../add-personal-brief-preprocessing/specs/mail-synchronization/spec.md) remains the target for continuous ingestion; this change supplies its evidence boundary without replacing or weakening it.

## Impact

- Extend `src/adapters/gmail.ts`, application ports, CLI/configuration wiring, and the pure domain layer; use the existing Google SDK and Node 24 toolchain. Text/HTML parsing dependencies, if needed, must be pinned and reviewed rather than borrowing development-only viewer packages.
- Load only independent Google worker credentials for preview. Existing `gmail.readonly` authorization is sufficient; no new Google scope is proposed.
- Produce evidence in memory and a sanitized terminal report. Do not persist mail, create a database migration, advance a Gmail checkpoint, or report worker synchronization freshness.
- Fulfill task 2.1 and the pure fingerprinting portion of task 2.3 in the [parent plan](../add-personal-brief-preprocessing/tasks.md). Expired-cursor recovery, durable queueing, no-change freshness, and scheduled observation remain pending there.
- Prepare for a subsequent immutable evidence-version ledger: the current source/job schema records identity and fingerprint but no corresponding message payload. Future jobs must reference the evidence version actually classified.
- Out of scope: Gmail mutations, history synchronization, launchd scheduling, Jev calls, obligation interpretation, Todoist/Drive changes, full historical backfill, attachment OCR/extraction, and linked-page retrieval.
