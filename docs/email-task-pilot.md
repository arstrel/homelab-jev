# Reviewed task pilot — October 21, 2026

Dates use Pacific time; the fresh run started at `2026-10-22T01:51:07.702Z`. Private review files and source content remain under ignored owner-only `.cache/mail-tasks/`, outside this report.

## Current position

Merged PR #16 delivered the manual preview/apply mechanism. Its first October 19 preview sampled older stored mail and returned four proposals, including promotional/conditional items and a generic title. No task was created. This follow-up changes eligibility questions, literal choice criteria, contextual review titles and message-recency ordering. It adds no dependency, migration, automatic capture or scheduler.

## Verification

- Offline synthetic tests exercise eligibility rejection despite a selected sentence, clear action acceptance, contextual title/apply validation, v1-file rejection, stable v1 creation identity and bounded request payloads.
- Disposable PostgreSQL tests cover recency independent of retrieval time, plus the existing ambiguous-intent, overlap, replay and atomic settlement behavior.
- A separate final live synthetic check passed six expected proposal/no-proposal cases: newsletter, optional promotion, conditional account notice, concrete request, explicit review request and resolved conversation. Initial wording missed the review example; the final wording distinguishes redundant sentences about one action from distinct obligations. This is a tiny prompt-development check, not a measured accuracy benchmark or held-out evaluation.

## Approved fresh preview

The user explicitly approved up to ten recent conversations sent to hosted Jev, with creation pending approval of exact proposals. One bounded read fetched ten eligible complete conversations from a three-day window using the existing paced Gmail reader. Complete evidence and exact jobs were stored through the existing ingestion adapter; no checkpoint was advanced.

| Observation | Result |
| --- | --- |
| Fresh complete conversations / new versions / new jobs | 10 / 10 / 10 |
| Jev samples / operational failures | 10 / 0 |
| Proposed / no clear action | 2 / 8 |
| Proposals | Two review actions; titles, destination names and Gmail links remain private |
| Task creation / task-intent changes | None |
| Database row counts during Jev preview | Unchanged after the deliberate evidence-ingestion step |
| Review artifact permissions | Owner-only; the locally formatted replacement title requires no further model request |

Source inspection identified one selected review-notification footer that needed the same subject-backed title treatment as generic review links. The final formatter and regression test cover that case; the saved proposal was reformatted locally without another private-mail transfer. Both proposals remain unapproved. This report does not establish that either is still outstanding or prove classification quality across all ten conversations.

## Remaining work

Read-only diagnostics after the run showed 526 pending exact-bound classification jobs, 409 pending retrievals and null evidence freshness. Discovery was last checked October 19; the bounded fresh read is not whole-mailbox catch-up. Persistent partial-body/provider-error entries remain. Five-minute deployment, persistent classification/reconciliation, Drive handoff and planner integration remain pending.

Next: obtain approval for a useful specific proposal, create only that task and verify replay through the existing apply command. Full reconciliation and unattended capture remain separate deliverables. See [commands](email-tasks.md) and [the main plan](../openspec/changes/add-personal-brief-preprocessing/tasks.md).
