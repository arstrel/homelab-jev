# Retro-aware planning brief

The existing manual publisher now includes recent read-only Retro feedback beside current Todoist tasks and stored email triage in the same private `jev-current.md`. Add typed review explicitly:

```sh
npm run build
npm run brief:publish -- --max-new 20 --retro-review
# Fresh source context without new hosted inference:
npm run brief:publish -- --max-new 0
```

This uses the existing Todoist token and Google Drive consent. No additional service, table, task mirror or scheduled job is introduced. The collector remains independent. It never completes or edits Todoist tasks, modifies Retro/Gmail, or changes scheduled planner prompts.

## Sources and limits

The reader selects exactly one active Retro project from the current project read: `TODOIST_RETRO_PROJECT_ID` when configured, otherwise its trimmed case-insensitive name. Missing or ambiguous identity produces unavailable context. The ordinary project inventory still excludes Retro.

Feedback uses a fixed seven-day window ending at command start, independent of the email `--days` setting. Read at most two pages of 100 open Retro tasks and two pages of 100 tasks completed within that window. Completed entries matter because daily feedback is commonly checked off. Separate recurring completions retain their occurrence timestamps. Source dates prefer completion, then update, then creation; these are provider record dates, not inferred dates of the activity described.

Read comments on the ten most recently changed distinct scanned tasks, up to two pages of 50 comments each. A recent comment can qualify even if its scanned parent task is old. Comments on older unscanned parents may be absent. Date/project/deletion filters apply before use. Attachments are counted but never downloaded. Missing dates, unread attachments, remaining pages, skipped comment parents and omitted feedback make coverage incomplete. Any failed/malformed read discards partial Retro context and publishes a fixed unavailable reason. Other-author or unknown-author text stays source context and cannot support an owner accomplishment.

Select ten newest dated task/comment records. Display escaped source excerpts, source links, timestamp basis and coverage; the source section has a 10,000-byte working bound. Feedback can contain private data. Keep the Drive file private and read the original source before acting. Console output has counts and fixed phases, not feedback text or task titles.

## Optional typed review

Without `--retro-review`, no new Retro inference occurs and the artifact says interpretation was not requested. A default replay replaces any prior interpretations with that explicit state; it never presents old model output as a fresh review.

Explicit review sends the full selected feedback text and current candidate task titles to hosted Jev. It omits dedicated IDs, attachments, address lists and task descriptions; IDs are resolved locally from finite references. At most 50 displayed current tasks are candidates. First, batches of ten questions distinguish finite actions, reusable activities, broad goals and unknown kinds. Then one request per owner feedback record chooses one candidate or none/unknown, a relation (completion, waiting, progress, none, unknown), and an exact supporting source excerpt. Questions are parallel independent choices; contradictory selections remain uncertain. No generated task title, due date or prose is accepted.

Use pinned `jev-1.13.0`, strict response/model/key/choice/probability/usage validation and a 32 KiB serialized request limit. Oversized source is rejected, never silently truncated for inference. Five-second calls have no SDK retries. All email and Retro attempts, including failures, share `--max-new` (0–20), the two-minute deadline and a 70-provider-request command ceiling. Email decisions consume the allowance first. Retro interpretations are ephemeral: repeating explicit review spends new calls. There is no recurring spend authorization or Retro cache.

Each required choice, including task kind, must meet a provisional 0.85 confidence threshold. This is uncalibrated and only controls review suggestions. Ambiguous task identity, unsupported/unknown choices, low confidence, foreign authorship, failed calls and missing excerpts remain uncertain. Exact excerpts containing explicit plans, common negations or quoted completion cannot become completion suggestions even if the model says completion. This small English conflict check is conservative and does not establish semantic correctness.

For a finite task, specific supported feedback may yield **Possible completion — review**, **Waiting — review** or **Progress — review**. Reusable activities remain available after a session, broad goals remain open after progress, and source-recurring tasks always retain future occurrences. “I finished setting up remote access” can suggest reviewing that specific finite task; “homelab setup went well” cannot establish every setup step finished. “I rowed today” does not consume tomorrow's rowing option. Nothing is automatically reconciled.

The review section shows feedback suggestions before task kinds, capped below 12,000 bytes with explicit omitted rows. The existing 24 KiB task section and 64 KiB whole-artifact limit still apply. Bound/unavailable/source gaps are visible and return exit 1 even if a degraded artifact was confirmed published; inspect `published` and coverage separately. Cancellation stops publication.

See [publication and recovery](email-brief.md), [OpenSpec design](../openspec/changes/add-retro-planning-brief/design.md) and [verification evidence](retro-brief-evidence.md). Automatic reconciliation and actual scheduled planner retrieval remain future work.
