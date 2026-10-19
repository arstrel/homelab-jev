# Proposal

## Why

Collection now supplies immutable complete conversation evidence. The next useful slice is to exercise Jev's typed judgments on that evidence before introducing task reconciliation or automatic capture.

## What Changes

- Add a bounded manual `mail:classify` preview over exact pending-job evidence, with independent message-kind, attention and lifecycle judgments.
- Validate model responses at runtime, retain available confidence/probabilities and explicit unknown outcomes, and report model/policy identity and token usage.
- Print sanitized judgments and counts without message content or identifiers; keep database data and pending-job state unchanged.
- Document the live collection observations and limits. This delivers the triage portion of parent 3.1; candidate matching, project routing, persistence/corrections, calibrated thresholds and capture remain separate work.

## Capabilities

### New Capabilities

- `mail-triage`: Bounded typed conversation judgments for manual inspection before automated effects.

### Modified Capabilities

None; durable main specifications have not yet been archived.

## Impact

Existing SDK and Zod, one SDK-free domain/port/application boundary, read-only pending-evidence selection, CLI/npm composition, tests and runbook/OKF updates. No dependencies, database migrations, scheduler or Todoist/Drive writes.
