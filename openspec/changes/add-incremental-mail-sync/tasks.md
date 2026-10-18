# Tasks

## 1. Discovery contracts

- [x] 1.1 Add internal sync state/backlog ports and Gmail profile/history reads with contract documentation; verify SDK fixtures cover all change types, deduplication, pagination, malformed data, shared budgets, and history-only expiry mapping without new scopes or writes.

## 2. Durable synchronization

- [x] 2.1 Add reviewed state/backlog migration and session-owned repository, reuse exact evidence persistence inside acknowledgement transactions and document ownership/freshness; verify disposable PostgreSQL fresh/repeat/upgrade, page rollback, stale revision/generation, evidence rollback, retry durability, exclusive lock skip/loss/release and preserved legacy data.
- [x] 2.2 Implement bounded bootstrap/history/retry application with explicit recovery-required behavior and operator documentation; verify synthetic scenarios cover restart and bootstrap race, failed/capped pages, pending work with no new mail, label-only replay, exclusions, cancellation, timestamps and sanitized output.
- [x] 2.3 Add Google/DB-only compiled `mail:sync` composition and npm command; verify options/configuration fail before side effects, overlap skips providers, pools close, signal/deadline limits apply and existing commands retain their contracts.

## 3. Integrated acceptance

- [x] 3.1 Reconcile parent scope and reviewed OKF claims/snapshots; verify links, knowledge and strict OpenSpec gates without claiming automatic recovery, launchd deployment or live synchronization.
- [x] 3.2 Run full offline and disposable PostgreSQL gates and inspect the complete diff/scenario evidence; verify no operational migration, private fixture data, classifier or remote writes are introduced.

Delivery follows acceptance through existing Git hooks and required PR checks.
