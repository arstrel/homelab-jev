# Automatic email classification

The five-minute brief refresh can now preprocess **up to ten due current conversations** before publishing. Collection remains a separate paced Gmail reader; PostgreSQL holds complete evidence and pending jobs. The classifier saves the same typed decisions and owner exclusions used by the brief. Display remains limited to the newest ten conversations, independently of queue processing. No task creation, Gmail changes or new service is involved.

```sh
npm run brief:publish -- --max-conversations 10 --days 7 --max-new 0 --classify-pending
```

`--classify-pending` requires `--max-new 0`, a Jev key and no `--retro-review`. It acquires the existing publisher lock, verifies managed schema readiness before any preprocessing effects, and processes due jobs, then the normal publisher reacquires that lock and refreshes the owned artifact using cached decisions and live Todoist/Retro sources. Fresh untried jobs take priority over retries, with newest arrivals first, so the initial backlog does not delay new mail for hours. Quiet cycles drain older work. Overlapping preprocessing skips. Failures retain jobs and defer them one hour; superseded versions are excluded. A conversation exceeding the 32 KiB classification input limit remains pending, even when Gmail retrieval is complete. This distinction matters: retrieval coverage and semantic classification coverage are separate.

Inspect `preprocessing.selected`, `classified`, `excluded`, `cached`, `failed`, `newRequests`, `inputTokens` and `budgetExhausted` in the report. The top-level `newRequests: 0` describes the publication stage only; it does **not** imply no preprocessing calls. A classification failure or exhausted allowance produces exit 1 even if `published: true`. Provider errors do not expose message content.

## Lifetime spending limit

The additive `0005_inference_allowance.sql` migration introduces one small allowance table. The stable allowance ID is `owner-approved-two-dollars/v1`, with a $2 ceiling and $0.01 initially charged as a conservative provision for earlier calls. It never resets per day, invocation or release. There is no automatic top-up/reset command.

Each hosted request first atomically reserves $0.002688: the maximum 64,000 input tokens at $0.042/M for pinned `jev-1.13.0`, with free output, no SDK retries and no long-context header. A valid response settles to its actual input-token charge. Provider failure, invalid output, lost connection or crash retains the maximum charge. A settlement is attempted once; database ambiguity stops classification. Cached decisions and owner exclusions cost nothing. Insufficient remaining allowance stops new calls and leaves publication available.

These assumptions were checked against the [official model reference](https://docs.typesafe.ai/models) on October 25, 2026. A price or context change requires reviewing the constants before continuing unattended inference. The cap covers this preprocessing path. Other manual commands/API clients must not spend against this approval outside the same accounting.

## Gmail retrieval repair

Ordinary HTML email layouts were incorrectly rejected by the shared 20-level MIME/HTML depth limit. HTML now has an independent depth limit of 200; MIME stays at 20. Existing 1 MiB body, aggregate evidence, response and 10,000-child limits remain. A failed plain-text representation can fall back independently within its MIME alternative container, retaining valid plain siblings, mandatory mixed sections and encrypted-body gaps. Successfully decoded siblings are cached within the message so fallback does not repeat external reads or charge evidence bytes twice. Genuine truncation without a complete alternative stays partial and retryable; attachments are not downloaded for classification. The queued partial-body retries require no data rewrite: normal collection retrieves complete evidence and acknowledges them atomically.

## Activation

Use the [deployment procedure](../deploy/brief-refresh.md). Feature code is reviewable before activation; install only a merged immutable release. Stop both existing jobs before applying the additive migration because older releases reject a newer migration journal. Update the collector and publisher to the same migration-aware release, enable the publisher flag, then resume both. Keep the allowance row through rollback; disable inference by removing `--classify-pending` and also `--capture-tasks` if enabled, while retaining `--max-new 0`, no `--retro-review` and the compatible release. Check recurring logs and independent source freshness after activation.

See [verification evidence](automatic-mail-evidence.md) for the cleared 101-thread retrieval backlog and one successful bounded live classification.
