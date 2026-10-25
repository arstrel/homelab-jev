# Automatic mail preprocessing verification

October 25, 2026; private content and provider identities remain in ignored evidence. The initial sections record pre-merge implementation/live checks. Subsequent [merged classifier/capture activation](automatic-capture-evidence.md) completed the operational follow-up; their original pre-activation statements below are historical.

## Gmail retrieval

Before repair, 101 queued threads all reported `partial-body`, with 18–81 previous attempts. Five paced read-only samples were ordinary 16–25 KB HTML emails rejected by the shared shallow DOM/MIME depth limit. The independent 200-level HTML bound made each complete, without relaxing MIME or byte limits.

A controlled retry through the existing locked, paced synchronizer acknowledged 100 of those threads in three bounded cycles. The remaining message had a 592-byte declared plain representation with 589 delivered bytes, plus a complete 4,081-byte HTML MIME alternative. The reader continued rejecting short plain data and accepted the complete alternative, preserving attachment metadata without downloading PDF contents.

The final cycle at **2026-10-25T17:02:52.447Z** reported:

- `discoveryCaughtUp: true`, `evidenceComplete: true`.
- `pendingRetrievals: 0`, `retryingRetrievals: 0`, `partialThreads: 0`, `reasons: []`.
- `evidenceSyncedAt: 2026-10-25T17:02:52.447Z`, exit 0, zero downstream provider writes.

This is complete coverage of the collector's configured synchronization scope at that observation, not an all-time mailbox export or proof that future unsupported messages cannot create gaps. The recurring collector must be upgraded to retain the fix.

## Jev classification

One recent complete pending conversation passed through the new classification application and the existing PostgreSQL save transaction: selected 1, classified 1, requests 1, failures 0. It used 1,090 input tokens, **$0.00004578** at the pinned model rate. No task was created and no Gmail state was changed.

This pre-merge manual smoke reserved a durable private one-call maximum of $0.002688 before invocation; its cost is included in the production allowance's $0.01 previous-usage provision. The production migration was deliberately left unapplied. Durable PostgreSQL admission/settlement, crash reservation retention, duplicate-settlement rejection, exhaustion, queue deferral and current-version selection were verified in disposable PostgreSQL with synthetic providers. Do not describe the one-off smoke as a recurring run or as operational migration validation.

## Release acceptance

Offline/isolated PostgreSQL verification and PR checks accompany the change. After merge, follow the coordinated [upgrade](../deploy/brief-refresh.md): prepare the immutable release, stop both jobs, back up the database, apply migration 0005 explicitly, upgrade both jobs and enable `--classify-pending`. Observe an actual recurring classification/publication and confirm independent retrieval freshness. This activation is not yet claimed by the evidence above.


## Copilot review follow-up

PR #23 fix loop 1/3 addresses two medium findings: verify managed schema readiness while holding publisher ownership before preprocessing can read work or spend, and recover MIME alternatives independently while preserving valid sibling representations. Added synthetic regressions cover non-ready/unavailable storage, mixed independently recoverable alternatives, and a valid external sibling fetched once with one final evidence-byte reservation. Earlier live verification remains historical; no additional live inference or provider mutation is needed for these corrections. Subsequent Copilot review and CI are required before reporting the revised PR ready.
