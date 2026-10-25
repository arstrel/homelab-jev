# Tasks

Reconciled October 25, 2026 against merged code, synthetic checks and dated operational evidence. Checked tasks meet their stated verification; open tasks may be partially implemented as described below. Historical proposals are the target, not current deployment status.

## 1. Application and connection foundation

Foundation implementation, provider grants and Git/CI gates are complete; see [foundation evidence](../../../docs/foundation-evidence.md).

- [x] 1.1 Pin the Node 24 patch and approved direct packages, retain the three installed provider SDKs, and commit the npm lockfile; verify npm ci succeeds from a clean installation using the documented runtime.
- [x] 1.2 Add the approved application/domain/adapter layout, strict ESM/NodeNext TypeScript configuration, tsx development entry point, and compiled CLI; verify application/tests/scripts type-check and compiled help/version run without credentials or network access.
- [x] 1.3 Add environment validation and sanitized diagnostics using the provided JEV_API_KEY and DB_* names, with DB_URL precedence; verify fake configuration cases cover fallback, invalid/missing fields, and secret redaction without reading the project environment file.
- [x] 1.4 Establish deterministic Vitest unit/application and MSW adapter test suites with fixed clocks/IDs, sanitized fixtures, and failing unhandled requests; verify a deliberate external request fails and tests cannot load production configuration.
- [x] 1.5 Add Biome configuration, an explicit developer fix command, and canonical npm run check combining offline tests, type checks, build/CLI smoke checks, document links, and pinned local OpenSpec validation; verify it fails on representative lint/type/test/spec errors and never mutates validation inputs.
- [x] 1.6 Install Husky pre-commit checks and the fully staged validation-input guard; verify disposable Git cases accept staged changes and reject partial staging, unstaged tracked inputs, relevant untracked files, and changes during checks without automatic stashing/staging.
- [x] 1.7 Add a disposable PostgreSQL 17 test helper and test-only connection validation; verify the integration harness connects to its isolated target, cleans up its resources, and refuses operational DB settings.
- [x] 1.8 Add a pre-push gate running offline and PostgreSQL checks for the pushed current-HEAD content; verify mismatched targets, dirty/untracked validation inputs, and failing database checks block the push in disposable Git fixtures.
- [x] 1.9 Add PR/push GitHub Actions jobs using the pinned runtime, npm ci, offline checks, and isolated PostgreSQL; configure required PR checks where supported and verify a controlled failing check blocks merge, documenting any account limitation.
- [x] 1.10 Document setup, all validation inputs, command contracts, hooks, test database lifecycle, dependency updates, and branch/PR workflow; verify the instructions against a clean checkout without personal credentials for offline checks.
- [x] 1.11 Verify operational PostgreSQL connectivity and add an isolated Drizzle schema with reviewed generated SQL migrations and explicit generation/application commands; verify fresh apply, repeat apply, and an upgrade/recovery procedure on a disposable database while unrelated schemas remain unchanged.
- [x] 1.12 Add checkpoints, pending jobs, classification records, task links, suppressions, and write intents through PostgreSQL repositories; verify transaction rollback and duplicate-source constraints with database tests.
- [x] 1.13 Document independent Google OAuth and Todoist worker authorization and verify supported scopes, API versions, and request-id semantics with bounded connection checks that print no credentials.

## 2. Incremental Gmail synchronization

- [x] 2.1 Implement configurable recent-mail bootstrap and incoming/sent thread retrieval; verify fixtures cover read messages, sent replies, and older threads resurfacing through new mail.
- [x] 2.2 Implement paginated history ingestion and durable pending jobs before checkpoint advancement; verify crash and classification-failure tests retain every fetched change.
- [x] 2.3 Implement expired-cursor recovery and source fingerprinting; verify repeated runs and read-state-only changes do not generate new processing obligations.
- [x] 2.4 Document bootstrap/recovery behavior and deliver an observation-run report; verify a second no-change run advances sync freshness without redundant Jev calls.

Delivery evidence: [sync/recovery runbook](../../../docs/mail-sync.md), [retrieval repair](../../../docs/automatic-mail-evidence.md) and the [October 25 no-change timer pair](../../../docs/mail-observation-evidence.md#october-25-catch-up-and-no-change-acceptance). Task 2.4 now has complete scoped collection plus a later zero-work freshness advance. Expired-cursor recovery remains synthetically tested; no live expiry was manufactured.

## 3. Jev decisions and evaluation

- [x] 3.1 Implement narrow typed questions, allowed-project choices, candidate matching, and explicit unknown outcomes; verify responses are validated and hostile email text cannot add a destination or action outside policy.
- [ ] 3.2 Add per-decision thresholds, model/policy versioning, and correction recording; verify corrections preserve original results and numeric/date operations run in code.
- [x] 3.3 Implement source-based task title templates and review fallback for complex wording; verify titles refer to supported actions and complex messages do not invent subtasks.
- [ ] 3.4 Evaluate roughly 100–200 representative corrected messages, keeping a held-out portion; deliver missed-action, incorrect-capture, routing, review-rate, latency, and cost results with documented threshold choices before enabling automatic capture.

Delivery: typed kind/attention/lifecycle judgments, bounded source-title/project/existing-task choices and explicit unknowns are implemented; see [triage](../../../docs/mail-triage.md), [reviewed task flow](../../../docs/email-tasks.md), [capture policy](../../../docs/automatic-todoist-capture.md) and their synthetic regressions. Task 3.2 remains open for corrections; model/policy identity and provisional thresholds already exist. Task 3.4 remains open: the owner-approved narrow create-only pilot uses provisional 0.95 thresholds and does not satisfy the original pre-capture representative-evaluation requirement.

## 4. Todoist obligation reconciliation

- [x] 4.1 Implement project/task synchronization, refreshable destination IDs, and Retro exclusion; verify current projects are recognized and archived destinations fall back to review.
- [ ] 4.2 Implement mapping-first, reference-based, and Jev-assisted matching; verify cross-thread matches and multiple distinct obligations in one thread with fixtures.
- [ ] 4.3 Implement durable task-creation intents, source markers, and ambiguous-response reconciliation; verify injected timeouts and overlapping attempts create at most one task per obligation.
- [ ] 4.4 Implement automatic themed-project capture and Inbox review candidates with source links; verify FYI/noise produce no tasks and one controlled live capture lands in its intended project.
- [ ] 4.5 Implement manual-edit preservation and completion/deletion suppressions; verify changed project/text/date fields survive synchronization and old mail cannot resurrect a completed or deleted task.
- [ ] 4.6 Add waiting/review visibility and sourced resolution suggestions; verify a sent reply can mark waiting, approval alone cannot complete a task, and unknown dates remain unset.
- [ ] 4.7 Document task ownership, label conventions, correction behavior, and replay recovery; verify the documented workflow against controlled mapped tasks without editing unrelated tasks.

Delivery: current bounded project/task reads and Retro exclusion are [implemented and live-read verified](../../../docs/todoist-brief-evidence.md). The [active create-only pilot](../../../docs/automatic-capture-evidence.md) adds exact-reference/semantic matching, durable intents/links, current-source checks and preserved remote fields. Tasks 4.2–4.7 remain open for their broader criteria: multiple obligations per conversation, ambiguous-write resolution, an actionable Inbox/review workflow and useful live capture, per-field correction tracking, waiting/lifecycle updates and full recovery acceptance. Current mapped-task replay suppression and create-only field preservation are implemented, not merely planned.

## 5. Retro and planning inventory

- [x] 5.1 Read Retro tasks and relevant comments as feedback; verify originals remain unchanged and broad accomplishment reports produce specific candidates with uncertainty.
- [ ] 5.2 Record a reviewed mapping of finite actions, reusable options, and broad goals from current Todoist inventory; verify rowing remains reusable and certification guidance produces bounded next steps.
- [x] 5.3 Document how the planner consumes feedback and reconciliation suggestions; verify fixtures cover a reported setup accomplishment with several still-open tasks without blanket completion.

Delivery: [Retro context and optional typed review](../../../docs/retro-brief.md) read tasks/comments, preserve originals and conservatively distinguish finite actions from reusable options/goals. [Synthetic and live evidence](../../../docs/retro-brief-evidence.md) supports 5.1/5.3. Task 5.2 remains open: live task-kind results were unverified model choices, not a human-reviewed inventory mapping. Complete Retro coverage and useful reconciliation quality are not claimed.

## 6. Drive publication and scheduled-task handoff

- [x] 6.1 Implement the Markdown snapshot contract and dedicated stable Drive file; verify generation IDs, source/task links, sync timestamps, failures, and freshness-only publication on a no-new-mail cycle.
- [x] 6.2 Implement recoverable publication and configurable freshness checks; verify failed publication leaves prior metadata intact and stale snapshots trigger explicit fallback behavior.
- [x] 6.3 Save the existing Daily Inbox Digest and Daily Life Plan instructions and draft updated handoff instructions; verify each actual task context can retrieve the latest snapshot generation and live Todoist items before applying the updates.
- [ ] 6.4 Integrate Todoist inventory, waiting/review states, Retro, and calendar block themes into daily-task instructions; verify a Home & Admin example selects fitting actions and leaves optional inventory optional.
- [x] 6.5 Document file ownership and rollback of the scheduled-task prompts; verify worker publication cannot overwrite existing plan/digest/retro artifacts and prior generated plans are not treated as completion evidence.

Delivery: [publication/recovery](../../../docs/email-brief.md) and [scheduled handoff evidence](../../../docs/scheduled-brief-evidence.md) cover the stable owned file, generation/readback, cache replay, failure metadata, prompt backups and live-source precedence. The October 23 timer runs plus October 25 approved full-JSON repair complete the isolated handoff slice. Task 6.4 remains open for its specific Home & Admin block/optional-inventory acceptance example; routine retrieval success does not itself establish that scenario.

## 7. Five-minute operation

- [x] 7.1 Add the one-shot launchd definition with explicit runtime, compiled release entry point, environment path, five-minute cadence, and a dedicated-connection PostgreSQL advisory lock; verify an overlapping invocation skips writes and lock ownership is released on exit.
- [ ] 7.2 Implement coordinated bounded provider retries, cycle deadlines, graceful termination, failure diagnostics, and pending-work recovery; verify rate-limit, expired-credential, host interruption, and restart scenarios preserve pending work and close database connections with sanitized output.
- [x] 7.3 Document start/stop, retention, diagnosis, and restart procedures; verify stopping preserves mappings and resuming processes pending work without duplicate tasks.
- [x] 7.4 Add reviewed-commit release preparation and an immutable compiled release directory with a stable pointer; verify runtime/commit recording and pointer switching without making production depend on the editable checkout.
- [ ] 7.5 Document and exercise explicit migration deployment, schema-compatible code rollback, and database recovery on an isolated environment; verify the previous release can be restored when compatible and no user tasks or source mappings are deleted.

Delivery: [collector controls and immutable packaging](../../../deploy/README.md), [activation evidence](../../../docs/mail-worker-evidence.md), [publisher operations](../../../deploy/brief-refresh.md) and [coordinated classifier/capture activation](../../../docs/automatic-capture-evidence.md) support the checked tasks. Task 7.2 has bounded retries/deadlines/ownership-loss tests but still needs the full cross-provider interruption matrix. Task 7.5 has explicit migrations, private backups and synthetic upgrade/repair checks; a complete isolated backup-restore/release rollback rehearsal remains open.

## 8. End-to-end rollout evidence

- [x] 8.1 Run the five-minute observation pilot and document chosen defaults and measured limitations; verify real sync freshness and zero Todoist/Gmail writes in observation mode.
- [ ] 8.2 Activate controlled automatic capture and complete a reply/waiting/manual-completion lifecycle; verify project routing, source linkage, correction preservation, and replay suppression end to end.
- [ ] 8.3 Observe one real Daily Inbox Digest and one Daily Life Plan run using the integration; verify latest-generation retrieval, appropriate block recommendations, and clear degraded-source reporting.
- [ ] 8.4 Exercise disable/re-enable and prompt rollback without deleting user tasks; deliver a release evidence report linking requirement scenarios to checks and list any remaining limitations before closing this change.

Delivery: collection-only [observation](../../../docs/mail-worker-evidence.md) and the [later no-change pair](../../../docs/mail-observation-evidence.md#october-25-catch-up-and-no-change-acceptance) support 8.1 without claiming an account-wide mutation audit. Both real daily runs consumed matching current generations and live sources; that narrow acceptance is [complete](../../../docs/scheduled-brief-evidence.md). Task 8.3 remains open only for the separately unverified block-fit recommendation criterion, also tracked by 6.4. Useful capture and the complete reply/waiting/completion lifecycle (8.2), disable/re-enable/prompt rollback exercise and final release report (8.4) remain open.
