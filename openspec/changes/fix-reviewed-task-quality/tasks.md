# Tasks

## 1. Proposal quality

- [x] 1.1 Implement literal eligibility/selection criteria, contextual source titles and v2 review validation while preserving v1 write identity; verify synthetic negative/positive cases, adapter requests, apply title checks and ambiguous-intent replay. Update the runbook and affected OKF claims.
- [x] 1.2 Order samples by message recency; verify a later-retrieved old conversation cannot displace recent mail in disposable PostgreSQL.
- [x] 1.3 Apply the owner's feedback: exclude routine GitHub PR notifications and Google Cloud terms updates before preview/apply; verify no model/write calls and preserve security/CI/direct-request handling. Mark current authorized routine PR mail read through the connected Gmail app, and document that continuous worker read-state automation remains separate.

## 2. Verification and delivery

- [x] 2.1 Run offline/PostgreSQL gates and the approved bounded fresh-mail preview; record aggregate findings and leave task creation pending specific human approval. Deliver the fix through normal Git gates and a PR.
