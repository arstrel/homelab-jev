# Tasks

## 1. Saved triage and report

- [x] 1.1 Implement bounded recent selection, exact-input decision reuse and atomic classification/job completion with the existing ledger; add the deterministic Markdown template and owner exclusions. Verify domain/application and disposable PostgreSQL cases for ordering, replay, changed input, unknown/failure behavior, atomic rollback and overlap; document the report's sample and privacy boundaries.

## 2. Dedicated Drive publication

- [x] 2.1 Implement the manual CLI and recoverable owned-file adapter using durably reserved IDs, generation/content verification and prior-publication metadata preservation. Verify offline HTTP/CLI/application tests for create/update/replay, lost responses, ownership refusal, caps, cancellation and safe output; document the publish/cached-only command and failure recovery.

## 3. Integration evidence

- [ ] 3.1 Run offline and disposable database gates, publish a bounded authorized live sample within the remaining $2 Jev allowance, read it back and repeat cached-only against the same file (or record the exact external blocker). Update relevant OKF/delivery evidence and deliver a PR without changing the active collector or scheduled prompts.
