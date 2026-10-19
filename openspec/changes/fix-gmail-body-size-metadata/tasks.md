# Tasks

## 1. Correct metadata handling

- [x] 1.1 Reproduce understated inline/external text failures with synthetic tests, fix the size check and verify complete Unicode decoding while existing short-read tests and actual-byte caps still pass; document the distinction in the retrieval runbook and OKF contract.

## 2. Verify and record evidence

- [x] 2.1 Run the full offline and disposable PostgreSQL gates; recheck the two affected conversations read-only and record aggregate outcomes without content, identifiers, operational writes or any completed-pilot claim.

Evidence: two synthetic cases failed before the repair; 192 offline tests and 45 disposable PostgreSQL tests pass afterward. Both affected live conversations now yield complete bodies during read-only verification, while the oversized control remains partial. Stored retrievals, sync state, job count and evidence count were unchanged. No new Jev request or operational synchronization run was performed. Parent collection acceptance remains open.
