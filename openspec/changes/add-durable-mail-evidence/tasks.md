# Tasks

## 1. Durable evidence contract

- [x] 1.1 Add validated complete-evidence storage types and SDK-free ingestion/lookup ports with contract documentation; verify synthetic unit fixtures reject partial, malformed and mismatched evidence without private diagnostics.
- [x] 1.2 Add reviewed schema/migration for immutable versions, observations and exact nullable legacy job bindings; verify fresh/repeat apply, populated prior-version upgrade, failed migration repair, immutable updates, binding constraints and unrelated data preservation in disposable PostgreSQL, and document deployment/rollback.

## 2. Atomic ingestion and command

- [x] 2.1 Implement transactional persistence and exact job-evidence lookup with repository documentation; verify replay/concurrent deduplication, rollback after insert, old/new version preservation, observation-only changes, legacy recovery without state reset and foreign-key retention using PostgreSQL tests.
- [x] 2.2 Add bounded ingestion orchestration and Google/DB-only compiled CLI/npm composition with a runbook; verify mixed coverage, no checkpoints/remote writes, validation before side effects, cancellation, resource closure, sanitized success/failure counters and unchanged preview with unit/application and compiled smoke tests.

## 3. Integrated acceptance

- [x] 3.1 Update reviewed OKF claims/snapshots, product progress and parent boundaries; verify local links, knowledge checks and strict OpenSpec validation without marking history ingestion or recovery complete.
- [x] 3.2 Run full offline and disposable PostgreSQL gates and inspect scenario coverage and the final diff; verify all acceptance scenarios and document live-operation boundaries without migrating or ingesting the operational database.

Delivery follows acceptance: commit/push through the existing hooks, create the requested PR and verify hosted offline/PostgreSQL checks.
