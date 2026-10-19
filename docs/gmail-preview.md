# Gmail evidence preview

Build first with the pinned Node runtime, then run the compiled read-only command:

```sh
nvm use
npm run build
npm run mail:preview -- --days 30 --max-threads 20
```

The npm command explicitly loads ignored `.env`; direct invocation is `node --env-file=.env dist/cli.js mail:preview --days 30 --max-threads 20`. It requires only `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` with `gmail.readonly`. See [Google setup](connections.md). Database, Jev, Todoist, and Drive configuration are not consumed. Help remains offline.

The fixed recent window includes read, archived, incoming and sent mail; Spam/Trash discovery is excluded. Retrieved conversations containing any non-draft Spam/Trash message are also excluded, even when another message matched discovery. This conservative whole-thread rule is shared with incremental sync. Selected conversations retain older context. Drafts are excluded; a recent draft alone does not make an old conversation eligible. A concurrent new reply can appear in retrieved context, so this is an observation, not a point-in-time snapshot.

## Bounds and outcomes

Defaults: 30 days (1–365), 20 selected threads (1–500), three concurrent reads, a 120-second overall deadline, 10-second request timeouts, 200 Gmail requests, 200 messages per conversation, 20 MIME nesting levels, 2,000 MIME parts per conversation, 4 MiB transport responses, 1 MiB selected body bytes per message and 10 MiB aggregate evidence bytes. Request retries are disabled. Authentication shares cancellation/time/payload limits. Hitting a limit is reported; no silent truncation is fingerprinted.

Every Gmail request start is paced by at least 1.5 seconds within the reader, including discovery, profile and separately stored primary text. The first request can start immediately. Pacing shares the 120-second deadline and cancellation; large requested samples can therefore stop at the deadline before reaching their thread cap. Separate commands/clients do not share a quota meter.

Recognized throttling (HTTP 429, or HTTP 403 with `rateLimitExceeded` / `userRateLimitExceeded`) reports `rate-limited` and stops new selections/requests, including when discovery fails. Already-started reads can finish and earlier complete evidence remains available to ingestion. Permission-related 403 responses remain ordinary failures. No raw Google error text is printed or retried by the SDK.

Exit `0` means exhausted discovery with complete eligible text evidence, including a genuinely empty result. Exit `2` means the thread sampling cap prevented complete discovery without another failure. Exit `1` means invalid options/configuration, provider/coverage failures, or an operational limit. SIGINT/SIGTERM abort outstanding reads and exit nonzero. Re-running rereads evidence; this command saves no state.

The JSON report contains time-window bounds, selected/retrieved/eligible/skipped counts, normalized message and excluded-draft counts, partial/failed counts, body-status counts across retrieved conversations, separate discovery/body coverage, fixed reasons and zero downstream writes. Bodies, addresses, subjects, source IDs, arbitrary errors and credentials are never printed. Internal evidence and fingerprints remain in memory. There is no evidence-export switch or automatic report file.

## Normalization and limitations

- Prefer plain text within MIME alternatives; otherwise convert supported HTML, preserving text, paragraphs and links. Preserve quotes and signatures. HTML is parsed without rendering, remote asset loading or script execution.
- Decode Gmail base64url with strict syntax and supported WHATWG TextDecoder charsets using fatal decoding. Unsupported encodings/malformed text remain explicit partial coverage. Normalize CRLF/CR to LF.
- Enforce body limits against actual decoded bytes as well as declared sizes. Gmail can understate its size metadata; fully delivered text longer than the declared count is retained. Shorter-than-declared data remains unsupported because it may be truncated. This applies to inline and separately stored primary text parts. The [provider body contract](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments#MessagePartBody) describes the returned data field; observed count discrepancies are recorded in the observation evidence.
- Fetch primary text parts stored behind attachment-body IDs. Never fetch PDF/image/document contents; preserve part ID, filename, MIME type and size only. Complete text coverage still says attachment contents `not-read`.
- Distinguish complete text, genuinely empty, unavailable, unsupported and too-large bodies. Oversized/deep/malformed conversations never become complete evidence. Nested encrypted body containers make coverage partial even alongside readable text or document attachments; a readable MIME alternative can still supply the body.
- Use `email-addresses` 5.0.0 for RFC-style lists/groups/quoted names, preserving local-part case and lowering domains. Use `html-to-text` 10.0.1 for inert conversion; detect its limit markers rather than accepting truncated output. Both are pinned runtime dependencies, independent of viewer development packages. Primary references: [address parser](https://github.com/jackbearheart/email-addresses), [HTML converter](https://github.com/html-to-text/node-html-to-text).
- Direction is a hint from `SENT` and mailbox-address relationships, not authentication proof. Uncertain aliases remain unknown. No new OAuth scope or send-as discovery is required.

See [the evidence contract](../src/domain/mail-evidence.md) and [OpenSpec design/examples](../openspec/changes/add-gmail-thread-evidence/design.md). Synthetic fixtures exercise older resurfaced requests, sent replies, drafts, HTML-only mail, MIME alternatives, external text bodies, unavailable/empty/oversized text, attachments and unsafe HTML. Parser or coverage limits have corresponding offline fixtures.

## Subsequent ingestion

Preview does not call Jev, infer obligations or deadlines, write labels/tasks/files, advance a checkpoint or report worker sync freshness. The separate [durable ingestion](mail-ingestion.md) command stores immutable normalized evidence versions and exact-bound jobs, with retention protecting referenced versions. [Incremental sync](mail-sync.md) adds paginated history, checkpoint safety and bounded expired-cursor recovery. Classification remains planned.

## Verification

Offline unit/application and MSW SDK tests use synthetic messages and fixed clocks; `npm run check` validates them without `.env`. Credentialed previews are manual and outside tests/CI. Record live counts and coverage only below, never private contents. The standard fully staged pre-commit and disposable PostgreSQL pre-push gates remain in force.

On October 11, 2026, the final bounded live preview used the window September 11 21:28:02 UTC to October 11 21:28:02 UTC. It selected, retrieved and found eligible 20 conversations / 20 messages, with no retrieval failures, skipped conversations or excluded drafts. Body statuses were 17 complete, one unsupported and two too-large. Discovery was incomplete because the 20-thread cap was reached; body coverage was incomplete for three conversations. Zero downstream writes occurred. Exit `1` correctly took precedence over the sampling status because text coverage was partial. An earlier bounded invocation returned the same aggregate coverage before body-status counters were added.

This verifies actual Gmail retrieval and honest degraded reporting, not complete mailbox synchronization or classifier quality. Unsupported/oversized bodies remain unclassified and have no complete fingerprint. Future pilot tuning can adjust limits after reviewing their impact; this feature preserves the conservative limits in the design.

## Acceptance coverage

| Evidence requirement | Offline evidence |
| --- | --- |
| Fixed recent window, read/archived/sent discovery | SDK query and resurfaced-context tests in `tests/adapters/gmail.test.ts`; fixed-clock paging test in `tests/unit/mail-preview.test.ts` |
| Pagination, deduplication, estimates, caps, page failure | SDK paging test and application exhaustion/stall/failure fixtures |
| Older context and draft exclusion/eligibility | Boiler fixture, old-context retrieval and draft-only skip tests |
| Source provenance and uncertain observation hints | Required-ID/timestamp rejection, group-address/reference-header and uncertain-direction tests |
| Primary body decoding and HTML conversion | Plain/HTML alternatives, mixed sections, HTML-only, stored text-part and charset tests |
| Explicit body/attachment coverage | Empty/unavailable/unsupported/size/UTF-8/HTML-limit fixtures, PDF and attachment-only tests |
| Stable substantive identity | `tests/unit/mail-evidence.test.ts` and adapter label/history/order replay test |
| Bounded cancellable reads | Concurrency/request-cap tests, SDK/OAuth timeouts, transport byte cap, MIME limits and in-flight cancellation tests |
| Independent private preview | Google-only command test, invalid-option/sensitive-output tests and compiled no-network smoke checks |
| Paced Gmail admission and terminal throttling | `tests/adapters/gmail-pacing.test.ts` checks concurrent starts, slow OAuth refresh, body-part propagation, deadline/cancellation and no later dispatch; application tests check stopped selection and retained results |
