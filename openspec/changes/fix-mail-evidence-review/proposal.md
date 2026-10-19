# Proposal

## Why

Ponytail review found two reproducible violations of existing mail-evidence requirements: manual ingestion accepts mixed Spam/Trash conversations, and nested encrypted MIME bodies can be silently omitted from supposedly complete evidence.

## What Changes

- Share the existing conservative thread-eligibility policy between manual ingestion and incremental synchronization.
- Propagate unreadable encrypted body coverage through MIME containers, preserving readable alternatives and attachment metadata behavior.
- Add regression tests and correct stale implementation-status documentation.

## Capabilities

No new or modified capability requirements. This repairs conformance to `add-gmail-thread-evidence` and `add-incremental-gmail-sync`; specification deltas are intentionally skipped.

## Impact

Existing mail application/domain helpers, MIME normalization, synthetic tests and related documentation. No dependencies, schema migrations, new services or live mailbox operations.
