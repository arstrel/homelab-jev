# Tasks

## 1. Gmail admission

- [x] 1.1 Deepen the Gmail adapter with 1.5-second admission pacing and structured terminal throttle classification; propagate body-part throttling and add fixed failure diagnostics. Verify concurrent/profile/history/thread/body reads, cancellation/deadline, no SDK replay, permission-error distinction and latched waiting reads with deterministic adapter tests; document the adapter contract.

## 2. Collection stop and resumability

- [x] 2.1 Stop preview/ingestion and sync selection after discovery/retrieval throttling while preserving ordinary discovery-failure behavior, earlier evidence and untouched work. Verify application and disposable PostgreSQL tests cover fixed reports, durable failed-item backoff, untouched later work and later due success; update collection runbooks/contracts and reviewed OKF claims/snapshots.

## 3. Architecture and integrated acceptance

- [x] 3.1 Deliver the requested skill-based architecture review as a temporary visual report and record the three adopted findings in design.md; verify no unrelated refactor, new dependency, migration or live acceptance claim, then run full offline/PostgreSQL gates and review the final diff for normal Git/CI delivery.
