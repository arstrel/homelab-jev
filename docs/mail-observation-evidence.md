# Gmail observation evidence

Status: **incomplete — discovery caught up, evidence backlog remains**. The latest session resumed from merged PR #12 and added 50 complete versions/jobs, reaching 165 pending exact-bound jobs and 735 pending retrievals. It stopped after three bounded invocations when provider errors recurred. A read-only follow-up captured Gmail HTTP 403 `rateLimitExceeded`. Evidence freshness remains null; parent task 2.4 and observation task 3.1 remain open. Follow the [manual observation procedure](mail-observation.md).

## Session record

| Item | Observation |
| --- | --- |
| Reviewed commit / runtime | `c7bcbc4de89362a91f47d16042d98389a07b8cd4` (merged PR #10); Node 24.21.0 |
| Target / backup | Configured database/role privately verified; PostgreSQL 17; owner-only custom-format backup outside the repo; archive listing validated before deployment |
| Gates before live access | Full offline gate: 168 tests plus formatting, types, build, smoke checks, document links, OKF and strict OpenSpec; disposable PostgreSQL: 42 tests passed |
| Schema readiness | `migration-required` → reviewed migrations 0000–0004 applied → `ready`, initially `uninitialized` |
| Configured window | 30 days; 2026-09-19T03:21:39.000Z to 2026-10-19T03:21:39.000Z |
| Session start / final diagnostic | 2026-10-19T03:07:43Z / 2026-10-19T03:24:45.109Z; elapsed about 17 minutes, including authorization pause |
| Budget | Maximum 20 manual invocations or 60 minutes; stopped at 8 invocations; per-run 5 discovery steps and 20 retrieval attempts |
| Totals | 884 queued references; 140 retrieval attempts; 115 complete versions and 115 exact-bound jobs; no unbound jobs |
| Remaining work | 769 pending retrievals: 744 due and 25 retrying; failures: 17 partial-body and 8 provider-error |
| Freshness | Discovery caught up at 2026-10-19T03:24:22.441Z; evidence timestamp remains null; no recovery/history gap |

The private backup was readable before deployment; no operational restore was performed. The standard disposable populated migration upgrade/recovery tests passed. No connection details, source IDs, message text, fingerprints or raw exceptions are included here.

## Run record

Columns group pages/references/attempted/acknowledged and partial/new-versions/new-jobs. Null backlog values in the first failed sync mean unknown, not zero.

| Run | Start / duration | Phase / exit | Pages / references / attempts / acknowledgements | Partial / versions / jobs | Pending / retrying | Fixed reasons |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-19T03:08:59.424Z / 0.825s | uninitialized / 1 | 0 / 0 / 0 / 0 | 0 / 0 / 0 | None / None | provider-error |
| 2 | 2026-10-19T03:21:37.762Z / 5.701s | bootstrap / 1 | 5 / 500 / 20 / 19 | 1 / 19 / 19 | 481 / 1 | page-limit, partial-body, retry-pending |
| 3 | 2026-10-19T03:22:15.205Z / 5.301s | history / 1 | 5 / 384 / 20 / 18 | 2 / 18 / 18 | 847 / 3 | partial-body, retry-pending |
| 4 | 2026-10-19T03:22:42.241Z / 4.481s | history / 1 | 1 / 0 / 20 / 19 | 1 / 19 / 19 | 828 / 4 | partial-body, retry-pending |
| 5 | 2026-10-19T03:23:25.146Z / 4.327s | history / 1 | 1 / 0 / 20 / 16 | 4 / 16 / 16 | 812 / 8 | partial-body, retry-pending |
| 6 | 2026-10-19T03:23:54.310Z / 4.528s | history / 1 | 1 / 0 / 20 / 14 | 6 / 14 / 14 | 798 / 14 | partial-body, retry-pending |
| 7 | 2026-10-19T03:24:11.122Z / 4.321s | history / 1 | 1 / 0 / 20 / 18 | 2 / 18 / 18 | 780 / 16 | partial-body, retry-pending |
| 8 | 2026-10-19T03:24:21.249Z / 3.481s | history / 1 | 1 / 0 / 20 / 11 | 1 / 11 / 11 | 769 / 25 | partial-body, provider-error, retry-pending |

The first run stopped before mail retrieval because Google rejected token refresh with HTTP 400, whitelisted category `invalid_grant`. Browser reauthorization saved a replacement token privately; a separate refresh check passed before run 2. This was a credential failure, not a missing configuration variable.

Runs 2–3 completed bootstrap/history discovery. Runs 4–8 observed no newly queued references while draining existing retrieval work. They are **not strict no-change samples**, because retrievals still ran and new evidence/jobs were created. No evidence-completion time was fabricated. The final diagnostic's earliest future retry was 2026-10-19T03:26:41.633Z; no retries were forced early or discarded. The provider errors' underlying HTTP category was not exposed by the collection report, so this report does not invent a root cause.

The remaining backlog exceeded what the session's remaining 12 invocations could drain at 20 attempts each. Stopping at the documented provider-failure boundary retains useful evidence and avoids an unjustified successful-pilot claim. Later explicit sessions can resume the saved state without repeating bootstrap.

## Acceptance matrix

| Behavior | Evidence |
| --- | --- |
| Diagnostic readiness / reviewed deployment | Live-observed missing migrations, private backup, applied existing migrations and ready storage |
| Bootstrap / history discovery catch-up | Live-observed in run 3; later runs retained caught-up discovery |
| Complete evidence and exact-bound jobs | Live-observed: 115 versions/jobs; final pending-job count 115, unbound count 0 |
| Durable incomplete/provider work | Live-observed: 17 partial-body and 8 provider-error retry entries retained separately from fresh work |
| Later due retry succeeds without new mail | Synthetic tests only; no due-retry success claimed in this session |
| Strict later no-change run advances evidence freshness | Not observed; backlog remains and evidence time is null |
| Expired-anchor/mapped recovery | Synthetic tests only; no expiry was manufactured |
| Zero downstream writes / zero Jev classification calls during collection | Executed collection command boundary; no Gmail/Todoist/Drive write capability or classifier in this path; not an independent account-activity audit |
| Scheduling / classifier quality | Outside this observation; not demonstrated |

Next collection action: resume bounded ingestion in a later explicit session, respect retry times, and diagnose persistent provider/partial-body failures before claiming evidence completeness. Never reset the window, delete retries or mark partial text complete to make acceptance pass. The separate Jev triage preview uses complete stored evidence and does not imply that collection acceptance or calibrated capture is complete.

## Follow-up diagnosis after PR #11

Read-only checks on October 18, 2026 (Pacific time), from merged base `277745c` sampled three due provider-error conversations and three due partial-body conversations. The three prior provider failures read completely without transport errors; their original failure cause remains unknown. Two partial-body samples contained valid decodable UTF-8 text but understated declared sizes: 6,162 declared / 6,165 delivered bytes and 780 declared / 781 delivered bytes. The third partial sample exceeded the existing HTML/body coverage policy. No private content or identifiers were exported to this report or sent to Jev.

Two synthetic regressions reproduced the inline/external-body rejection before the fix. The parser now accepts delivered data longer than its size metadata, while rejecting shorter-than-declared data as possible truncation. Independent actual-byte, aggregate, transport and decoding limits remain in place; an understated-metadata oversized-body regression verifies that reported size cannot bypass the actual limit. Google's [body resource documentation](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments#MessagePartBody) identifies the returned data as the part's content; the count discrepancy above is an observed provider behavior, not a documented estimate guarantee.

Read-only verification with the corrected parser returned complete evidence for both affected conversations and retained `too-large` partial coverage for the control. Before/after comparison confirmed unchanged retrieval rows, synchronization state, pending-job count and evidence-version count. This did not acknowledge work, retry the operational sync loop, change freshness, or complete parent 2.4. Full offline validation passed 192 tests and disposable PostgreSQL passed 45 tests. Resume normal bounded synchronization after deployment to persist eligible evidence and investigate remaining gaps.


## Resumed session after PR #12

Observed on October 18, 2026 (Pacific time); timestamps below use UTC. This was a separate deliberate session with the same 20-invocation/60-minute maximum and 5-page/20-thread per-run limits. The original session above remains historical evidence.

| Item | Observation |
| --- | --- |
| Reviewed commit / runtime | `889df882bb7afc2fa2ffebccbb8696ba2230b7e9` (merged PR #12); Node 24.21.0; clean checkout and fresh build |
| Preparation | Configured database/role privately reverified; PostgreSQL 17 and existing managed schemas ready; prior private backup retained; no new migration |
| Gates before live access | Full offline gate: 192 tests plus formatting, types, build, smoke checks, 144 document links, 30 OKF concepts and 10 strict OpenSpec changes; disposable PostgreSQL: 45 tests passed |
| Session baseline / final diagnostic | 2026-10-19T03:58:04.800Z / 2026-10-19T03:58:56.058Z; about 51 seconds |
| Window / phase | Existing 30-day window unchanged; history phase throughout; no reset, recovery or history gap |
| Baseline | 769 retrievals, all due; 25 retrying; failures: 17 partial-body and 8 provider-error; 115 pending jobs, none unbound |
| Session totals | 23 queued references; 60 retrieval attempts; 50 acknowledgements, new complete versions and exact-bound jobs; 2 partial attempts and 8 provider failures |
| Final state | 735 pending retrievals, 725 due and 35 retrying; failures: 12 partial-body and 16 provider-error; 165 pending jobs, none unbound |
| Freshness | Discovery checked at 2026-10-19T03:58:31.523Z; evidence timestamp remains null; earliest future retry 2026-10-19T04:03:11.276Z |

| Run | Start / duration | Phase / exit | Pages / references / attempts / acknowledgements | Partial / versions / jobs | Pending / retrying | Fixed reasons |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | 2026-10-19T03:58:09.791Z / 4.074s | history / 1 | 1 / 23 / 20 / 18 | 2 / 18 / 18 | 767 / 27 | partial-body, retry-pending |
| R2 | 2026-10-19T03:58:21.033Z / 4.204s | history / 1 | 1 / 0 / 20 / 20 | 0 / 20 / 20 | 747 / 27 | retry-pending |
| R3 | 2026-10-19T03:58:30.582Z / 3.371s | history / 1 | 1 / 0 / 20 / 12 | 0 / 12 / 12 | 735 / 35 | provider-error, retry-pending |

Collection stopped at the provider-failure boundary after R3. A bounded read-only diagnosis selected eight recently failed retrievals: its first provider request returned HTTP 403 with whitelisted reason `rateLimitExceeded`. The other seven samples reused the rejected mailbox-profile promise and did not make independent provider requests. This confirms throttling in the follow-up, not eight independently confirmed rate-limit responses or the cause of every historical provider failure. No retrieval was acknowledged or retry date changed by diagnosis.

Google's current [Gmail quota table](https://developers.google.com/workspace/gmail/api/reference/quota) lists 6,000 units per user per project per minute for new projects and 120 units for `threads.get` with `format=full`. Fifty full-thread reads alone consume 6,000 units, before discovery/profile/body-part calls. This is consistent with throttling during three quick batches; the project's actual configured quota was not inspected in Cloud Console. Google's [error guidance](https://developers.google.com/workspace/gmail/api/guides/handle-errors#ratelimitexceeded) identifies this reason as rate limiting and recommends backoff.

A later deliberately resumed manual session should space 20-thread batches by at least 60 seconds after each completion, retaining any longer saved retry times. The runbook now records that pacing. Request-count and concurrency caps are not quota-unit pacing, and per-item retry backoff does not stop subsequent reads in the same invocation. Application-level throttle handling remains a separate possible change; no new limiter, runner, scheduler or schema was added here.

Acceptance remains incomplete: discovery stayed caught up and exact-bound evidence increased to 165 versions/jobs, but neither complete evidence nor a strict no-change run was observed. Due-retry success was not separately traced in this session; live recovery remains unobserved. The executed collection/diagnosis paths made zero Jev calls and no Gmail/Todoist/Drive writes. Pending work remains intact for continuation; no real conversations were sent to Jev.
