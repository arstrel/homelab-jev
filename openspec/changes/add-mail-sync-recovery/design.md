# Design

## Context

See proposal.md for motivation. The existing exclusive PostgreSQL session owns discovery state, retrieval backlog and atomic evidence acknowledgements. History expiry currently persists `recovery-required`. Task links identify mapped conversations but do not contain live Todoist completion state.

## Goals / Non-Goals

Recover within the existing manual command and limits, with restartable state and conservative mapped coverage. No scheduler, live Todoist reads, classification, remote writes or production activation.

## Decisions

- Add `recovery-bootstrap` and `recovery-mapped` phases. Capture a fresh Gmail anchor before freezing a new recent window, then scan recent mail, scan mapped targets and catch up history. Restarting from a recent scan alone could miss mail received during the scan.
- Snapshot all local task-link thread IDs into a durable target table in the same transaction that starts recovery. Keyset pages of 100 targets avoid loading the inventory into memory. All mappings conservatively cover open obligations without introducing a Todoist dependency. Preserve unfinished targets across renewed expiry and union current mappings.
- Promote existing backlog to history eligibility and advance its generation atomically when recovery begins. Preserve attempts, retry times and failures; otherwise moving the recent window could incorrectly exclude older known work. Evidence, jobs, task links and suppressions remain intact.
- Reuse page tokens per phase, resetting their cycle guards at phase boundaries. Commit target queueing before removing the completed target snapshot. Each discovery attempt and recovery initialization consumes one discovery step under `maxPages`; page commits remain separately counted. Repeated anchor expiry is therefore bounded by steps, requests and deadline.
- Store recovery count, start/completion times, previous anchor and a sticky history-gap flag. Reports expose fixed scope, counts and timestamps, never identifiers or mail content. Only history catch-up plus an empty backlog advances evidence freshness and recovery completion. The history gap remains explicit after successful bounded recovery because intermediate expired history cannot be reconstructed.
- Keep provider and evidence adapters unchanged. Missing mapped mail acknowledges retrieval without removing mappings or completing tasks; incomplete bodies remain retryable.

## Risks / Trade-offs

- All mapped threads can include completed obligations → conservative extra reads, paginated under existing limits.
- Recovery cannot reconstruct every change in expired history → sticky gap reporting and explicit recent-window plus mapped scope.
- Another anchor can expire during a long recovery → retain durable work and restart under the same invocation limits.
- A large mapping snapshot costs a database statement → server statement timeout and atomic rollback prevent partial initialization.

## Migration Plan

Add a versioned migration with defaulted recovery metadata, expanded phase constraint and an empty target table; preserve populated state and ledger rows. Validate upgrades in disposable PostgreSQL. Deployment requires the normal explicit migration step; development does not migrate the operational database. Stop sync before rollback: the previous binary cannot interpret active recovery phases. Resume an older sync binary only after recovery has returned to a compatible history state; retain the additive schema and all evidence.
