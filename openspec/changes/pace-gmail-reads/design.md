# Design

## Context

See proposal.md. Baseline is merged PR #13 (`a076797`). `gmailReader` funnels Gmail reads through one adapter closure with explicit bearer acquisition and disabled SDK retries. `MailBudget` also governs Jev triage, so Gmail pacing belongs inside the Gmail adapter. Preview uses concurrent workers; sync reads sequentially under ownership. Body normalization converts ordinary part failures into partial coverage, which must not hide a terminal throttle signal.

## Goals / Non-Goals

**Goals:** bounded invocation-local request pacing; typed/sanitized throttling; stop further work while retaining completed and pending evidence; deterministic coverage of production call paths.

**Non-Goals:** distributed quota accounting, a token bucket framework, persistent global cooldown, automatic SDK retry, new configuration flags, changed coverage policy, live observation acceptance or scheduling.

## Decisions

1. **Deepen the existing Gmail adapter module.** Keep admission, authentication options and Google error interpretation behind the existing reader interface. A serialized admission queue spaces actual Gmail request starts by 1,500 ms using monotonic time and abortable waits. Acquire the bearer token before admission so a slow shared refresh cannot bunch starts afterward; construct request timeouts after waiting. The first start is immediate. Every Gmail operation, including attachment-backed text, uses the same queue. Do not move policy into the generic `MailBudget` or add a pass-through transport module. A small optional timing dependency supplies production monotonic time/abortable timers and deterministic test behavior; no CLI setting disables pacing.
2. **Latch only recognized throttling.** Map HTTP 429 or HTTP 403 with structured known rate reasons to `MailReadError("rate-limited")`. Check the latch before authentication and after pacing; requests already in flight can finish. Preserve HTTP 404 history/missing-thread semantics and other fixed failures. Do not inspect free-text messages or serialize response bodies. No hidden retry occurs.
3. **Carry terminal information through MIME and orchestration.** Rethrow rate limiting from body normalization. Stop preview workers from taking new IDs and skip retrieval if discovery was throttled; ordinary discovery failure retains its documented behavior. Keep report coverage incomplete even when selected reads were never attempted. Sync skips retrieval after discovery throttling; on retrieval throttling it durably defers only that item with existing 5–60 minute backoff, then exits the loop. Do not abort the shared budget on throttling: the failed item's retry and report finalization still need to complete. Previously committed evidence remains.
4. **Repair the existing diagnostic seam.** Add `rate-limited` to the fixed domain failure and DB-only status whitelist. Failure storage is text; no schema change is needed. An older diagnostic will conservatively count this new value as unknown. Keep parent collection acceptance open until separate live catch-up/no-change evidence exists.
5. **Act on the requested architecture review.** The independent review found the shared budget/provider policy split, swallowed terminal body errors and discovery-to-retrieval continuation. Address those three with local changes. Keep reader ports, transactions, recovery, semaphore and MIME decomposition intact; no speculative broad refactor. Present the review visually outside the repo and retain a concise checked-in decision record here.

## Risks / Trade-offs

- Pacing reduces a two-minute invocation's capacity → preserve existing deadline and resumable work; do not increase limits to compensate.
- Separate processes/other clients can still exceed quota → scoped claim plus terminal throttle handling; retain existing sync ownership and manual session stop limits.
- Production timing differs from fake timing → test production waits with controlled timers, concurrent transport starts, cancellation/deadline and structured errors; adapter/application tests cross the actual reader seam.
- Already-started reads can finish after a throttle → preserve valid evidence; prevent waiting/new reads from dispatching once the failure is known.

## Migration Plan

No migration or dependency change. Run the full offline and disposable PostgreSQL gates, review docs/OKF snapshots, and deliver a PR. Deploy a fresh build after merge; live observation remains separate. Rollback changes only code and leaves evidence, retry dates, jobs and failure text intact.
