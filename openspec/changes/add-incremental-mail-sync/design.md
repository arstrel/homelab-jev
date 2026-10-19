# Design

## Context

See [proposal](proposal.md). Existing preview reads a bounded sample; ingestion stores immutable complete versions/jobs but has no discovery state or retrieval retries. The legacy checkpoint table conflates cursor and sync time. This change uses separate state rather than relabeling legacy checkpoints as a new safety guarantee.

## Goals / Non-Goals

**Goals:** Manual resumable collection; durable retry work; exact evidence acknowledgement; distinct discovery/evidence freshness; exclusive ownership.

**Non-Goals:** Automatic expired-anchor recovery, mapped-obligation recovery scans, launchd, classifier/remote writes, deployment, retention cleanup.

## Decisions

1. Add `mail_sync_state` and `mail_retrievals`. State stores bootstrap bounds, history anchor, page token, phase, bounded seen-token chain, revision and separate discovery/evidence timestamps. The initial Gmail profile anchor is obtained before bootstrap begins. Bootstrap completes into history at that anchor; new mail during the scan is replayed through history. Historical IDs remain digit strings, compared with BigInt only when necessary. No new scopes. Primary references: [history API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.history/list), [profile](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users/getProfile).

The bootstrap upper bound is rounded to the next second after obtaining the anchor. Rounding down could exclude mail already covered by that anchor in its current second; such mail would also be absent from subsequent history. A small overlapping boundary is safe because evidence/jobs deduplicate.
2. Each page transaction upserts thread IDs into the retrieval backlog and updates state together. A final history page establishes discovery catch-up; intermediate pages preserve the original anchor plus continuation token. A failed page never advances. Seen tokens prevent cycles across runs, with a 2,000-page chain ceiling. Defaults: five discovery pages per run (1–20), 20 retrieval attempts (1–500), existing 120-second/read/request/MIME/body budgets. Recent-window days (default 30, 1–365) are fixed at initialization; explicit conflicting days are rejected. A capped bootstrap is not complete.
3. Backlog rows carry a generation, attempts, next-attempt time and fixed failure category. Rediscovery bumps generation and makes work due; retry uses exponential 5-minute to 60-minute delay. Acknowledge only the selected generation. Complete evidence/job persistence and backlog removal share the existing evidence transaction implementation. Missing threads and draft-only or Spam/Trash-bearing threads are explicit terminal retrieval outcomes, preserving old evidence/task links; partial bodies remain retryable without complete fingerprints. Whole-thread exclusion is conservative when any non-draft message bears Spam/Trash. Bootstrap retrieval checks recent eligibility; history retrieval retains changed older threads.
4. Hold a PostgreSQL session advisory lock on a dedicated connection for the run. All sync transactions run on that same connection, so losing its lock also loses its ability to commit. Emit a cancellation signal on connection error. Other sync commands skip without provider calls. Release/destroy the dedicated connection in finally; no remote calls occur inside transactions. Revision/generation conditions additionally reject stale updates.
5. Complete evidence freshness advances only after a successful final history page in this run and an empty backlog. Discovery freshness records only an exhausted history read; the new history cursor is a discovery frontier, not proof of normalized evidence. This refines the parent's single-cursor wording and keeps its no-loss intent: discover IDs durably first, then acknowledge exact evidence atomically. It observes current complete thread versions, not a historical snapshot of every intermediate Gmail revision. Classification failures cannot remove jobs.
6. HTTP 404 from history alone becomes `recovery-required`; a missing full thread remains a terminal retrieval result. State/data are preserved; no reset/rebootstrap flag is introduced. Existing backlog can still be drained while recovery is required, but freshness does not advance. Invalid page tokens and other errors retain the last committed page for diagnosis/retry.
7. Compose `mail:sync` with Google/DB validation, injected runtime/ports, shared cancellation and sanitized counts/timestamps only. No actual history IDs, page tokens, subjects, addresses, evidence or arbitrary SQL/provider exceptions are printed. Exit 0 means complete evidence catch-up or an explicit overlap skip; exit 2 means bounded unfinished discovery/work without operational failure; exit 1 means retries/failures/recovery required. SQL commit acknowledgement loss is reported as uncertain failure, resolved by replay rather than assumed rollback.

## Risks / Trade-offs

- [History expires during a long bootstrap] -> Explicit recovery-required stop; automatic recovery is the next chunk.
- [Permanent partial bodies] -> Backoff and visible pending gaps rather than silently dropping work or claiming fresh evidence.
- [Mutable Gmail pagination] -> Pre-bootstrap anchor and history replay reduce gaps; no mailbox point-in-time snapshot guarantee.
- [Single account namespace] -> Retain `primary`; switching accounts requires a separate ledger/namespace migration.
- [Database/private growth] -> Only IDs/retry metadata are new outside existing private evidence; no automatic GC or live activation.

## Migration Plan

Add a reviewed forward migration; do not modify applied SQL. Preserve legacy evidence/jobs/checkpoints and task links. Test fresh/repeat and populated prior-version upgrade, transaction failure, restarts and lock release on disposable PostgreSQL. Old application code remains schema-compatible. Do not apply operational migrations or run credentialed sync during implementation.
