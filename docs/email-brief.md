# Manual Drive email brief

This is a bounded email and current Todoist context artifact, not the complete Daily Life Plan handoff. It uses current complete stored conversations, saved typed judgments and fresh read-only Todoist pages. Collection continues independently; this command does not fetch Gmail, create Todoist tasks, change read state, or edit scheduled prompts.

```sh
nvm use 24
npm run build
npm run brief:publish -- --max-conversations 10 --days 7 --max-new 10
# Publish again without new inference or a Jev key:
npm run brief:publish -- --max-conversations 10 --days 7 --max-new 0
```

Configuration: existing reviewed database schema, `DB_URL` (or DB variables), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, and `drive.file` consent. `TODOIST_API_TOKEN` enables current task context; optional `TODOIST_RETRO_PROJECT_ID` preserves Retro exclusion after a rename. A project named Retro (trimmed, case-insensitive) is also excluded. A missing Todoist token publishes an explicit unavailable section with exit 1. `JEV_API_KEY` is needed only when `--max-new` is positive. The explicit npm command loads `.env`; tests and hooks never do.

## Selection, judgment and privacy

The default is ten conversations whose latest message falls within seven days. `--max-conversations` accepts 1–20, `--days` 1–30 and `--max-new` 0–20. Selection is newest-message-first with a stable source-ID tie-breaker, excluding future timestamps. Retrieval time does not make an old conversation recent. Only the latest stored complete version and its exact-bound job are selected; the command cannot know about uncollected mail. The report distinguishes the selected sample from all eligible stored conversations.

Narrow owner rules for routine GitHub PR notifications and Google Cloud terms notices precede inference. Otherwise existing Jev kind/attention/lifecycle triage runs with pinned `jev-1.13.0`. Necessary subjects, bodies, timestamps and direction hints are sent to hosted Jev, capped at 32 KiB of state per conversation without truncation. Address lists, dedicated source IDs and attachments are omitted; bodies can themselves contain private information. Calls have five-second timeouts, no SDK retries and a shared two-minute command deadline. A new-attempt cap includes failed requests; it is not a recurring budget or permission for unattended spending.

Validated decisions are saved in existing classifications, atomically with exact-job completion. Cache identity includes evidence fingerprint, direction hints, pinned model and decision policy. Changed input requires a fresh decision; unchanged replay uses saved results. Deterministic exclusions have no fabricated model confidence. Unknown judgments are saved as unknown. Invalid/oversized evidence, invalid results and provider failures remain visible and retryable; failed jobs are not completed. A malformed cache fails closed for review. These uncalibrated judgments do not authorize task effects.

The private template groups Action, FYI, Noise, Waiting, Uncertain/review and owner exclusions. Waiting takes priority over attention; resolution suggestions and unknown choices require review. Each item has an escaped subject, Gmail source link, timestamp and typed choices/confidences. It contains no message bodies or address lists. Coverage includes generation, message window, observation/freshness timestamps, backlog, retries and history gaps. Retro feedback and Calendar context are explicitly absent. Fresh generation never implies fresh complete collection.

Console output contains counts, fixed failure phases, returned usage and a confirmed Drive URL, without subjects, message bodies or Gmail identifiers. Keep the Drive artifact private; do not commit live content or operational credentials.

## Current Todoist context

Each publication fetches up to five pages of 100 projects and two pages of 100 open tasks. Only current active non-Retro projects and their returned open tasks appear. Duplicate task IDs are collapsed; completed/deleted items and tasks without an available project are omitted. Page caps and missing-project counts are disclosed. The read interval is reported separately from Gmail freshness because API pagination is not an atomic snapshot.

The task section groups source titles by current project with Todoist links and existing due date/datetime/timezone values. No due date is inferred or reformatted into a new date. Task titles remain source data, including optional activities; the integration does not decide that everything on the list is mandatory. Descriptions are read locally for explicit links, never published or sent to Jev. Task contents are fetched afresh each time rather than stored in PostgreSQL. The section has a 24 KiB display bound with an explicit omitted-item count; the whole file retains its 64 KiB limit.

An email in Action is annotated **Already tracked (explicit source link)** when a displayed open task description contains its exact supported Gmail conversation link: `https://mail.google.com/mail/u/0/#all/<id>`, `#inbox/<id>` or `#sent/<id>`. Multiple matches remain visible (up to three inline links, with the remaining count pointing to the task section). Similar wording, bare IDs, other accounts, search routes and unrelated hosts do not establish a match. This is a conversation association, not proof that every action in a thread is covered or completed. No link or an omitted task is not evidence that the work is untracked.

A successful renamed/moved/removed task read appears on the next publication, even with `--max-new 0`; this adds no Jev questions and leaves the email cache identity unchanged. Provider/malformed-response/pagination failures discard partial contents and produce a fixed unavailable section. Incomplete or unavailable Todoist context exits 1 while allowing an otherwise confirmed degraded Drive publication. Cancellation/deadline still stops publication. No previous task list is presented as a new successful read.

## One owned destination and recovery

The command allocates a Drive file ID and reserves it durably in the existing `drive` write intent `email-brief:primary` before creation. It creates root-level `jev-current.md` (`text/markdown`) with app-private ownership/generation markers, without changing sharing or folder permissions. The [Drive pre-generated ID contract](https://developers.google.com/workspace/drive/api/guides/create-file#generate-ids-to-use-with-your-files) prevents duplicate creation after a lost response.

Explicit retries resolve that same ID. An existing file must match the expected name, MIME type and owner marker and must not be trashed. The command refuses unrelated/renamed files and never searches by filename. A missing previously confirmed file requires operator investigation; no replacement is created automatically. Do not manually reset the intent to bypass this protection.

Before writing, the intent becomes ambiguous. Metadata generation and exact uploaded content must both read back correctly before success is recorded. The prior successful generation/time remain in the database after a failed update; a partially completed remote update can still exist, so inspect the artifact and retry the command explicitly. There is no cross-service transaction or claim that remote bytes roll back. Successful saved judgments survive publication failures and are reused on retry.

A separate session lock skips overlapping publishers before any providers, without taking collection's mailbox lock. Remote calls happen outside SQL transactions. Classification persistence failures stop publication. Partial classification can publish an honest uncertain report with exit 1; `published: true` tells whether the artifact was confirmed. Exit 0 means the bounded operation succeeded or an overlap skipped, not whole-mailbox catch-up. `--max-new 0` marks uncached cases visibly as capped and exits 1 if any exist.

## Verification

Offline domain/application and HTTP tests cover cache/input changes, owner precedence, uncertain outcomes, caps, cancellation/deadline, escaping, create/update, ownership, lost responses and read-back mismatches. Todoist cases cover paginated reads, project/Retro filtering, due values, exact link boundaries, changing task state, truncation and degraded reports without new inference or task writes. Disposable PostgreSQL tests cover recency/current-version selection, atomic rollback, exact binding, reserved-ID recovery, prior-publication preservation and overlap. Compiled CLI configuration/option checks remain network-free. Run `npm run check` and `npm run test:integration` before live work.

See the [initial live publication and cached-only replay evidence](email-brief-evidence.md) and [Todoist context verification](todoist-brief-evidence.md), recorded separately from synthetic guarantees. Provider usage is an estimate at [published model prices](https://docs.typesafe.ai/models), not a billing receipt. Scheduled publication, real planner retrieval, full task reconciliation, Retro interpretation and calibrated automatic capture remain later deliverables.
