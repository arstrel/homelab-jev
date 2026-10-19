# Proposal

## Why

Manual ingestion cannot remember mailbox discovery progress or retry a failed conversation unless the recent sample selects it again. Incremental history with a durable retrieval backlog makes bounded repeated runs recoverable without coupling discovery to classification.

## What Changes

- Add manual `mail:sync`, resumable recent-window bootstrap and paginated Gmail history discovery.
- Commit discovered thread IDs and discovery progress atomically; keep complete evidence freshness separate from discovery progress.
- Persist retryable retrieval work and acknowledge it atomically with exact-bound evidence/jobs.
- Prevent overlapping synchronization commands from owning the mailbox simultaneously.
- Report expired history as recovery-required without reset or data deletion. Automatic recovery, scheduling, classification and remote writes remain subsequent changes.
- Preserve manual preview/ingestion, legacy checkpoints, evidence and task mappings. No operational migration or live synchronization is performed during implementation.

## Capabilities

### New Capabilities

- `incremental-mail-sync`: Resumable bounded discovery, durable retrieval backlog, exclusive mailbox ownership and truthful synchronization status.

### Modified Capabilities

None. The parent synchronization plan retains automatic expired-cursor recovery and deployed five-minute operation.

## Impact

Gmail adapter/ports, PostgreSQL state/backlog migration and repositories, evidence-transaction reuse, application/CLI, tests, runbooks and reviewed OKF claims. No new packages, OAuth scopes or Redis dependency.
