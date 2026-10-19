# Gmail observation evidence

Status: **incomplete — discovery caught up, evidence backlog remains**. Google reauthorization succeeded and seven subsequent bounded sync runs collected complete conversation versions safely. The session stopped after eight total runs when eight retrievals returned provider errors; pending work and retry dates are preserved. Parent task 2.4 and observation task 3.1 remain open because complete evidence and a strict later no-change observation were not achieved. Follow the [manual observation procedure](mail-observation.md).

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
