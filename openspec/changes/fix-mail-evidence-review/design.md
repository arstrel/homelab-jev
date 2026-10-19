# Design

## Context

See proposal.md for motivation. Incremental synchronization already rejects any conversation containing a non-draft Spam/Trash message; manual preview supplies ingestion but currently checks only recency. MIME selection currently represents both omitted attachments and unreadable encrypted containers as an empty selection.

## Goals / Non-Goals

Keep manual and incremental eligibility consistent while preserving history/recovery handling of older conversations. Preserve the distinction between optional attachment contents and unreadable message bodies. No new classification, scheduling or persistence behavior.

## Decisions

- Put a shared eligibility predicate in the existing mail-evidence domain module. An optional window preserves history/recovery behavior. Duplicating the fix in preview would leave two policies to maintain.
- Let the existing MIME selector return an unreadable sentinel for encrypted body containers. Mixed containers propagate it; alternatives may choose a readable representation. A blanket rejection of all unknown MIME leaves would incorrectly reject supplemental calendar/media attachments.
- Seed observation fixtures directly through the existing typed schema. Acquiring/destroying a sync session during setup introduced an unnecessary race with the test's subsequent lock acquisition; actual held-lock observation remains exercised in the test body.

## Risks / Trade-offs

Conservative exclusion can skip a normal message sharing a thread with excluded content; this matches the existing synchronization policy. Synthetic regressions cover mixed labels, nested encryption, readable alternatives and attachment-only content.

## Migration Plan

No database migration. Existing evidence is unchanged; fixes apply on subsequent retrieval. Rollback is a code revert.
