# Tasks

## 1. Repair evidence eligibility and coverage

- [x] 1.1 Reproduce mixed Spam/Trash ingestion and nested encrypted-body failures with synthetic tests, then verify shared eligibility and MIME selection fixes pass those tests and existing synchronization/attachment regressions; update the related runbooks and OKF claims.
- [x] 1.2 Correct README and knowledge implementation-status statements against current recovery code, and verify documentation links and knowledge validation.
- [x] 1.3 Remove the observation fixture's CI-observed advisory-lock teardown race by seeding state directly; verify the existing concurrent snapshot/held-lock test and full disposable PostgreSQL gate still pass.

## 2. Integration verification

- [x] 2.1 Run full offline and disposable PostgreSQL gates, inspect the final diff for scope and secret exposure, and record the review outcome.

Review outcome: two correctness findings repaired with five new test cases. Four new cases failed on the previous implementation; all 168 offline and 42 disposable PostgreSQL tests passed locally. GitHub CI additionally reproduced a fixture-only lock-teardown race, addressed by task 1.3. Full `npm run check` passed formatting, types, build, CLI smoke checks, document links, OKF and strict OpenSpec validation. Diff review found no credentials, new dependencies or migrations. Credentialed provider behavior and operational pilot acceptance were not exercised.
