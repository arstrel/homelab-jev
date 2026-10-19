# Tasks

## 1. Typed provider judgments

- [x] 1.1 Add finite triage questions, minimized/bounded state and strict runtime result validation with policy/model identity; verify synthetic unit/MSW tests cover independent actionable notifications, unknown answers, hostile text, missing/extra keys, invalid numbers, timeout, cancellation and no retries/logging; document the policy and calibration boundary.

## 2. Manual exact-evidence preview

- [x] 2.1 Add bounded stable pending-job selection and exact evidence validation in a read-only PostgreSQL transaction; verify disposable tests cover historical binding, unbound/corrupt evidence, limits/order and unchanged jobs/results/state.
- [x] 2.2 Add CLI/npm preview with early validation, bounded sequential calls, safe judgments/counts and resource closure; verify application/compiled CLI tests cover mixed outcomes, deadlines, cancellation, privacy and repeated previews without writes; update runbook and relevant OKF concepts.

## 3. Integrated evidence

- [x] 3.1 Record actual bounded collection observations with any coverage gaps and leave unsuccessful acceptance open; run full offline/PostgreSQL gates, review the diff and perform a bounded classification smoke check without enabling capture or claiming measured quality.

Evidence: full offline gate passed with 189 tests, formatting/types/build, compiled CLI checks, document links, OKF and strict OpenSpec; disposable PostgreSQL passed 45 tests. An explicitly approved one-conversation compiled smoke test returned valid answers under `jev-1.13.0`, with jobs/classifications/sync unchanged. Collection discovery caught up and stored 115 complete versions/jobs; 769 retrievals remained (17 partial-body and 8 provider-error retries). The pilot stopped under its failure condition; parent 2.4 and observation task 3.1 remain open. Parent classification task 3.1 also stays open for candidate matching and allowed-project routing. This change makes no classifier-quality or automatic-capture claim.
