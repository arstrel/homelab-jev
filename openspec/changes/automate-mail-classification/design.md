## Context

The collector and cached-only publisher already run independently every five minutes. Complete evidence and current-version jobs exist in PostgreSQL. See proposal.md for motivation. Live diagnostics found five ordinary 16–25 KB HTML emails rejected by the shared 20-level parser depth limit.

## Goals / Non-Goals

Classify bounded pending evidence without another service, publish cached results afterward, and repair ordinary HTML retrieval. No automatic Todoist creation, Gmail mutation, Retro inference, historical mailbox-wide backfill or model upgrade.

## Decisions

- Add `brief:publish --classify-pending`, using the publisher's existing exclusive lock, exact evidence/cache contract, owner rules and save transaction. Classification runs before cached-only publication. Prioritize untried jobs and newest arrivals; quiet cycles drain older backlog. Select at most ten due current jobs independently of the ten-email display sample; defer failed jobs one hour. Do not repeatedly select completed or superseded versions.
- Keep scheduled `--max-new 0` for the display/Retro path. Add a small classification application and reuse the existing database session rather than introducing a queue service.
- Add one PostgreSQL lifetime budget row. Seed $2 total with $0.01 conservatively charged for earlier calls. Before each hosted request reserve the pinned model's maximum 64,000 input tokens at 42 nanodollars/token ($0.002688); settle validated usage after success, retain the entire reservation on errors/crashes. Atomic conditional updates, shared session ownership, no SDK retries or long-context header, no reset or refund command. Budget exhaustion disables new inference while cached publication continues. This allowance covers this worker; unrelated/manual API usage must not bypass it under this authorization.
- Use a separate HTML DOM depth limit of 200, retain MIME depth 20, per-body 1 MiB, aggregate/response limits and child-node truncation checks. The final queued failure had plain text shorter than its declared size and a complete HTML MIME alternative. Keep rejecting the short representation, but retry normalization with the complete alternative before reporting partial. Mixed sections remain mandatory and encrypted siblings remain partial. No snippets, attachment text or incomplete bodies are promoted to complete evidence.

Pricing/context reference checked October 25: https://docs.typesafe.ai/models ($0.042/M input, free output, default 64k per request, long context off).

## Risks / Trade-offs

- Permanently oversized/encrypted or malformed content remains a visible gap; fixes must not invent complete coverage.
- A failed call can conservatively consume more allowance than its actual cost; this keeps the lifetime cap safe through ambiguous outcomes.
- Pending jobs completed by earlier manual workflows are not reprocessed automatically; new evidence versions are eligible.
- New migrations make old release schema checks incompatible; prepare the reviewed new releases and switch both collector/publisher together. Rollback disables classification first and uses the new migration-aware runtime with cached-only publication; do not remove budget history.

## Migration Plan

Run all offline and isolated PostgreSQL checks. Verify the new normalizer against queued failures with paced read-only diagnostics, then bounded live synchronization and classification under the allowance. Create a reviewable PR. After merge apply the additive migration and install the merged immutable release for both jobs, with the publisher flag enabled. Check recurring logs and evidence freshness. Keep explicit remaining gaps if any.
