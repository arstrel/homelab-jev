# Knowledge change log

## 2026-10-25 current backlog and foundation cleanup

`mail:status` now counts pending primary jobs bound to current source evidence, matching classifier identity while retaining deferred work. Unbound legacy jobs are reported separately; superseded rows remain stored and legacy raw `status` is unchanged. Removed unused foundation mutations/lookups and retained only production raw status. Direct disposable fixtures preserve schema-constraint coverage; active ingestion/sync/task adapters retain transaction and replay checks. Updated ledger/checkpoint/observation claims and replaced obsolete mutation provenance with the actual sync/task adapters. Reviewed only changed source snapshots, preserving review deadlines and human-verification metadata. These corrections await merged-release deployment; no live counts or provider effects are claimed.

## 2026-10-25 idle capture reads

Capture now selects local work and checks evidence/exclusions/classification confidence before loading Todoist inventory. Empty or entirely locally ineligible batches make no capture provider calls; eligible records reuse one initial inventory, retaining fresh inventory/evidence checks before semantic linking or creation. Reviewed the changed use case, capture runbook and unit tests against dependent concepts; their ownership, privacy, admission and release boundaries remain unchanged. Refreshed only those three reviewed source snapshots, preserving all review deadlines and human-verification metadata. Synthetic regressions cover idle/unavailable providers, local outcomes, shared inventory and pre-write freshness. The fix awaits merged-release deployment; brief publication still refreshes its own Todoist context.

## 2026-10-25 delivery reconciliation

Reconciled requirements, README and the parent OpenSpec checklist with the implemented collector/classifier/capture/publication/handoff slices. Recorded a strict zero-work collector timer pair at 20:17:17.791Z and 20:22:23.307Z, closing scoped catch-up/no-change observation; closed the already-verified Pages deployment/review tasks. Kept broad evaluation, corrections, useful capture, multi-obligation/lifecycle and full rollback acceptance open. The specific block-fit criterion remains distinct from accepted daily-consumer retrieval. Historical observations retain their original dates and outcomes.

Reviewed the six original source-drift warnings before updating snapshots:

- `architecture/mail-ingestion.md`: schema change adds the migration-0005 inference allowance; immutable evidence/manual-ingestion behavior is unchanged.
- `operations/classification-evaluation.md`: parent tracking now reflects implemented typed choices and active pilot policy, while corrections/representative evaluation remain open.
- `operations/mail-observation.md`: readiness now includes the allowance table; diagnostics remain read-only. Later timer evidence supersedes the old freshness gap.
- `operations/okf-maintenance.md`: AGENTS.md adds mandatory Copilot review and the three-fix-loop limit. Recorded hosted-graph acceptance without inventing human knowledge verification.
- `operations/secret-handling.md`: the publication runbook adds scheduled-handoff references; its private artifact and source-context restrictions remain. Public OKF hosting contains curated engineering knowledge only.
- `operations/test-isolation.md`: the intentionally conflicting migration-journal fixture changes its expected count from six to seven for migration 0005; operational-data isolation is unchanged.

Reviewed dependent concepts against the revised requirements/design/evidence and removed superseded present-tense summaries. Refreshed only those reviewed source snapshots. Meaningful-change timestamps advance for changed claims; existing review deadlines and all human-verification metadata remain untouched. No application behavior, runtime deployment, provider state or hosted Jev request changed.


## 2026-10-25 capture pilot activation

Activated reviewed merged PR #25 on the publisher after a private backup, preserving the collector, schema, source mappings and lifetime allowance. Verified a real five-minute invocation and exact private Drive/capture-counter readback. No post-boundary sources were present, so no task-write or matching-quality acceptance is claimed. Recorded zero retrieval gaps separately from the remaining classification backlog and incomplete Retro coverage. Prepared a conditional header correction with a successful-create regression; that wording patch awaits review/merge. Updated relevant claims and source snapshots without changing review deadlines or human verification.

## 2026-10-25 bounded Todoist capture

Activated merged PR #23 after private backup/migration and verified genuine recurring classification/publication plus exact owned-file readback. Recorded zero retrieval gaps at observation separately from incomplete classification/Retro context. Added an opt-in create-only capture pilot with exact-reference/bounded semantic matching, preserved user fields/mapped completion, strict review outcomes, source-time admission and a three-intent daily cap. A two-request live shadow produced none/review and zero Todoist writes. Reviewed relevant claims/source snapshots; retained draft/unverified status and review deadlines. Capture awaits merge and activation; general lifecycle and calibrated evaluation remain open.

## 2026-10-25 Copilot PR review gate

Recorded mandatory Copilot findings checks and a maximum of three fix/re-review loops per PR. Corrected readiness-before-preprocessing and independent MIME recovery in PR #23, with synthetic regressions. Updated relevant claims and source snapshots without changing review deadlines or adding human verification; re-review remains required.

## 2026-10-25 automatic mail preprocessing

Prepared bounded pending-email classification with a durable lifetime allowance and repaired separate HTML layout depth bounds. Updated only relevant architecture claims and source snapshots, retaining review deadlines and draft status. Recurring activation remains a separate merged-release upgrade; do not mistake implementation/live diagnostics for timer acceptance.

## 2026-10-22

Added bounded recent Retro context and explicit finite-choice human-review suggestions to the manual Drive brief. Reviewed source, privacy, budget, preservation and delivery claims with their relevant snapshots; preserved draft/unverified state and original review deadlines. Automatic reconciliation and scheduled planner acceptance remain planned.

Approved live verification reviewed ten Retro records against 43 task titles, preserved uncertainty for all ten and confirmed the same private Drive artifact. Source coverage remains capped; zero-inference context refresh and final Retro-only publication are recorded separately from matching quality. Updated the Retro/handoff evidence snapshots while preserving original review deadlines and draft/unverified status. No tasks, collector, prompts or reset credits changed.

## 2026-10-21

Added current read-only Todoist context to the existing manual Drive brief: project-grouped open tasks, source due values and exact Gmail-link associations, with Retro excluded. Reviewed privacy, provider bounds, layering, cache separation, degraded-source reporting and deterministic gates against code and synthetic tests. Updated relevant source snapshots while preserving existing review deadlines and draft/unverified status. Live cached-only publication and independent read-back verified 43 displayed tasks across eight projects, six Retro tasks excluded, the same private Drive ID and zero new Jev requests. Exact-link/task-change acceptance uses controlled reads; no matching live source link or altered live task is claimed. Todoist remains authoritative; no semantic matching, task mutation or scheduled prompt change is introduced.

Implemented a bounded manual email-only Drive brief with saved exact-input triage, deterministic owner exclusions and one reserved app-owned file. Reviewed cache/transaction, uncertainty, privacy, ownership/read-back, layering and deterministic gate claims against source and synthetic/disposable tests. Updated relevant source snapshots while preserving review deadlines and draft/unverified status. The authorized ten-conversation live publication saved six Jev judgments and four owner exclusions, then replayed ten cached decisions with zero new requests against the same private file. Estimated spend was $0.000691. Recorded merged collector activation and two automatic runs separately from its unfinished catch-up/no-change acceptance. Full planner integration and unattended inference remain planned.

Added collection-only native deployment tooling with isolated compiled releases, private credential/schema preflight, explicit launchd control and failed-activation restoration. Reviewed affected scheduling, development and delivery claims while preserving draft/unverified status and existing review deadlines. A real archived production-dependencies-only build and DB-only status check passed. Two bounded manual batches added 39 complete evidence versions/jobs without new provider failure or throttling, leaving 522 retrievals and null evidence freshness. Recurring activation/catch-up acceptance remains pending a merged release; no Jev call, task creation or Gmail mutation occurred.

Refined manual task proposals with independent eligibility, literal quoted criteria, contextual review titles and message-recency sampling. V2 review files replace v1 files while preserving v1 write identity. Reviewed affected provider, routing, classification, replay, delivery and test claims/snapshots; draft/unverified status and review deadlines remain unchanged. A tiny final six-case synthetic check passed, followed by one explicitly approved ten-conversation fresh pilot yielding two review proposals and eight no-clear-action outcomes. Ten complete evidence/jobs were stored; no task or intent was created. Current diagnostics retain 409 pending retrievals and null evidence freshness. Human capture approval, broad evaluation and rollout remain pending.

The owner rejected both fresh proposals: routine GitHub work is handled continuously in GitHub, and Google Cloud terms updates are unwanted todos. Added narrow deterministic exclusions before Jev and during apply, with synthetic boundary tests. Under explicit instruction, the connected Gmail app marked 37 routine PR messages read; two CI failures remained unread. Worker read-state automation is still separate and the Google grant remains read-only. No task creation or new private-mail transfer followed this feedback.

## 2026-10-19

Added a small manual reviewed email-to-Todoist flow using existing SDKs and tables. Preview offers bounded source sentences and current projects; apply creates explicit selections with durable request identity, atomic links and uncertain-response stop. Reviewed affected routing, classification, delivery, provider, layering and gate claims; connection-check scope is unchanged. Updated relevant source snapshots deliberately while preserving review deadlines and draft/unverified status. No live email transfer, task creation, evaluation or deployment is claimed.

Observed merged PR #14 under the existing manual session limits: 20 paced runs / 400 retrieval attempts added 351 complete versions/jobs without a new provider error or throttle report. Stopped at the invocation cap with 516 exact-bound jobs and 409 pending retrievals; partial-body coverage and prior failures remain visible, evidence freshness is null and catch-up/no-change acceptance stays open. Reviewed the current observation/delivery claims and evidence snapshots while preserving review deadlines and draft/unverified state. No new runtime change, scheduler or live classifier call occurred.

Resumed the authorized collection observation after Google reauthorization: discovery caught up, 115 complete versions/jobs were stored and 769 retrievals remained when the session stopped at provider failures. No complete/no-change acceptance was claimed. Added read-only bounded Jev triage preview over exact evidence, with finite independent judgments, runtime schemas, numeric model revision, cancellation and synthetic/disposable tests. Reviewed changed delivery/layering/provider/test/privacy claims and source snapshots; existing review deadlines and draft/unverified status are preserved. One explicitly approved real-conversation smoke check passed with stored jobs/classifications/sync unchanged; this is not a classifier-quality evaluation.

Recorded the first authorized operational observation: verified target, private readable backup, reviewed migrations through 0004 and ready/uninitialized storage. The initial sync failed at Google token refresh before retrieving mail; the report retains incomplete status and the acceptance tasks remain open. No live catch-up, no-change result, recovery or classification quality is claimed.

Reviewed mail retrieval and ingestion using Ponytail. Repaired shared Spam/Trash eligibility and nested encrypted-body coverage with reproducing synthetic tests, and corrected stale recovery implementation status. Reviewed the affected layering, checkpoint, recovery, sync and private-data claims before updating source snapshots; preserved unchanged generation timestamps, review deadlines and draft/unverified state. No operational mailbox or database writes were performed.

GitHub CI exposed an observation-fixture lock teardown race. Seeded typed state directly so the held-lock/snapshot test no longer races its own setup session closing; production ownership behavior is unchanged. Updated the test-isolation claim and source snapshot while preserving the review deadline and draft state.

Added read-only mail diagnostics and the bounded manual observation procedure. Reviewed the new port/SQL/report boundary, migration-readiness semantics, test isolation and pending live-evidence claims. Source snapshots follow reviewed code/docs; unchanged review deadlines and draft/unverified labels are preserved. Live synchronization acceptance remains an evidence-report result, not an implication of tooling delivery.

Added bounded expired-cursor recovery, durable mapped-target coverage and explicit unreplayed-history reporting. Reviewed changed sync, checkpoint, ledger, migration, test and delivery claims against implementation and synthetic tests. Reviewed unchanged classification, routing, manual-edit, Retro, planner, ownership, layering and release policies against the narrow product/design/schema changes before updating their snapshots. Meaningful-change timestamps advance only for changed claims; existing review deadlines and draft/unverified state remain intact. No operational migration, live recovery, scheduler or classifier quality is claimed.

## 2026-10-18

Added invocation-local Gmail request pacing and terminal rate-limit handling after a skill-based architecture review. Kept provider policy inside the Gmail adapter, preserved throttling through MIME normalization and stopped further collection selection without discarding earlier evidence or unattempted work. Synthetic transport/application and disposable PostgreSQL checks cover timing, slow refresh, cancellation, diagnostics and resumability. Reviewed affected retrieval, sync, layering, diagnostic and test claims plus unchanged checkpoint/recovery/connection-check snapshots; preserved review deadlines and draft/unverified status. Live catch-up/no-change acceptance remains open.

Resumed collection from merged PR #12 after fresh offline/PostgreSQL gates: three bounded runs added 50 complete versions/jobs, leaving 735 retrievals and null evidence freshness. Follow-up diagnosis captured Gmail rate limiting; documented manual batch spacing using the current published quota costs. Reviewed observation/delivery claims and source snapshots while preserving deadlines and draft/unverified state. No complete/no-change acceptance, scheduler or further live Jev call is claimed.

Diagnosed collection gaps after the triage merge: three sampled provider failures read successfully, while two partial-body samples exposed understated Gmail size metadata. Repaired the exact-size rejection with inline/external regressions and preserved short-read/actual-byte limits. Read-only verification accepted both affected bodies and kept the oversized control partial, without updating storage or freshness. Reviewed the evidence/retrieval snapshots and preserved review deadlines and draft/unverified state.

Added manual incremental sync, separate discovery/evidence freshness and durable retry/acknowledgement ownership. Reviewed checkpoint, ledger, layers, delivery, provider, migration, test and evaluation claims against current code. Updated reviewed snapshots deliberately; unchanged policy claims keep their meaningful-change timestamps, and existing review deadlines/draft status are preserved. Automatic cursor recovery, scheduled deployment and live synchronization are not claimed.

## 2026-10-17

Added durable evidence ingestion and reviewed ledger, layers, checkpoint handoff, delivery boundaries, remote-effect scope, migration compatibility, private database storage, testing and evaluation claims. Updated only reviewed concept snapshots and meaningful-change timestamps; retained existing review deadlines and draft/unverified state. No operational migration, live ingestion or classifier evaluation is claimed.

## 2026-10-11

Added the implemented Gmail evidence contract and revised layers, checkpoint/ledger handoff, delivery state, connection-check scope, development gates, evaluation boundaries, test isolation and privacy claims. Reviewed source snapshots deliberately for those changed concepts. Preserved existing review deadlines and draft/unverified status; no human verification or classifier-quality claim was added. Recorded sanitized live coverage, including unsupported/oversized bodies, rather than claiming complete synchronization.

## 2026-10-10

Initial Jev OKF v0.2 bundle, based on the supplied Drive deck/notes, pinned Google specification and merged Node/Drizzle foundation. Introduced grouped navigation and 25 draft concepts with delivery state, source snapshots and review deadlines. No human verification or production classifier integration is claimed.
