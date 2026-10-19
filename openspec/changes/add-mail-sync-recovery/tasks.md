# Tasks

## 1. Durable recovery state

- [x] 1.1 Add recovery metadata, target snapshots and transactional session operations with migration and PostgreSQL tests covering upgrades, rollback, pagination and preservation of queued work; document state decisions in design.md.

## 2. Recovery orchestration

- [x] 2.1 Implement bounded resumable recovery and history catch-up with unit and PostgreSQL tests covering restarts, repeated expiry, mapped old/missing mail, partial evidence and freshness; document report semantics in the sync runbook.

## 3. Architecture and acceptance

- [x] 3.1 Update product/OpenSpec progress and affected OKF concepts with reviewed source snapshots; verify knowledge and strict OpenSpec validation.
- [x] 3.2 Run offline checks and disposable PostgreSQL integration checks, inspect the complete diff and confirm no operational migration or downstream writes occurred.

Delivery: commit the validated change, push the feature branch and open a PR with validation evidence.
