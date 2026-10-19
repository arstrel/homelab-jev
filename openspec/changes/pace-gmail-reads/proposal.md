# Proposal

## Why

The live catch-up observation hit Gmail rate limiting after rapid 20-thread batches. Existing request/concurrency bounds do not pace reads, and generic provider errors allow the batch to continue after throttling.

## What Changes

- Space Gmail request starts by at least 1.5 seconds per reader invocation, including profile, discovery/history, full conversation and separately stored body reads.
- Recognize HTTP 429 and HTTP 403 with `rateLimitExceeded` or `userRateLimitExceeded`; expose only fixed `rate-limited` diagnostics and latch the reader closed to further requests.
- Stop preview/ingestion and sync selection on throttling, propagate throttling through MIME normalization, and preserve completed evidence plus unattempted durable work and normal retry dates.
- Apply worthwhile findings from the requested architecture review at the existing adapter/orchestration seams; preserve the generic budget used by Jev.
- Document pacing scope and deterministic tests without claiming live catch-up or activating scheduling.

## Capabilities

### New Capabilities

- `gmail-read-admission`: Invocation-local paced Gmail reads and a terminal throttling signal across collection paths.

### Modified Capabilities

None. There are no archived main specs; this capability complements the existing retrieval/sync change contracts.

## Impact

Gmail adapter, MIME error propagation, collection orchestration, failure diagnostics, offline/disposable PostgreSQL tests and relevant docs/OKF concepts. No new dependency, migration, distributed limiter, retry framework, scheduler, provider write or live Jev call. Per-reader pacing does not coordinate separate processes or other account clients.
