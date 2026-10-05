# Tasks

## 1. Application and connection foundation

- [ ] 1.1 Add a Node 24/TypeScript application skeleton and one-shot observation command; verify installation, type checking, and a no-network startup succeed.
- [ ] 1.2 Add secret-file exclusions, environment validation, and sanitized diagnostics; verify missing credentials give actionable errors and fixture secrets never appear in logs.
- [ ] 1.3 Verify PostgreSQL connectivity and create isolated Jev migrations; verify migration/reversal on an isolated database and confirm unrelated schemas remain unchanged.
- [ ] 1.4 Add checkpoints, pending jobs, classification records, task links, suppressions, and write intents; verify transaction rollback and duplicate-source constraints with database tests.
- [ ] 1.5 Document independent Google OAuth and Todoist worker authorization and verify supported scopes, API versions, and request-id semantics with bounded connection checks that print no credentials.

## 2. Incremental Gmail synchronization

- [ ] 2.1 Implement configurable recent-mail bootstrap and incoming/sent thread retrieval; verify fixtures cover read messages, sent replies, and older threads resurfacing through new mail.
- [ ] 2.2 Implement paginated history ingestion and durable pending jobs before checkpoint advancement; verify crash and classification-failure tests retain every fetched change.
- [ ] 2.3 Implement expired-cursor recovery and source fingerprinting; verify repeated runs and read-state-only changes do not generate new processing obligations.
- [ ] 2.4 Document bootstrap/recovery behavior and deliver an observation-run report; verify a second no-change run advances sync freshness without redundant Jev calls.

## 3. Jev decisions and evaluation

- [ ] 3.1 Implement narrow typed questions, allowed-project choices, candidate matching, and explicit unknown outcomes; verify responses are validated and hostile email text cannot add a destination or action outside policy.
- [ ] 3.2 Add per-decision thresholds, model/policy versioning, and correction recording; verify corrections preserve original results and numeric/date operations run in code.
- [ ] 3.3 Implement source-based task title templates and review fallback for complex wording; verify titles refer to supported actions and complex messages do not invent subtasks.
- [ ] 3.4 Evaluate roughly 100–200 representative corrected messages, keeping a held-out portion; deliver missed-action, incorrect-capture, routing, review-rate, latency, and cost results with documented threshold choices before enabling automatic capture.

## 4. Todoist obligation reconciliation

- [ ] 4.1 Implement project/task synchronization, refreshable destination IDs, and Retro exclusion; verify current projects are recognized and archived destinations fall back to review.
- [ ] 4.2 Implement mapping-first, reference-based, and Jev-assisted matching; verify cross-thread matches and multiple distinct obligations in one thread with fixtures.
- [ ] 4.3 Implement durable task-creation intents, source markers, and ambiguous-response reconciliation; verify injected timeouts and overlapping attempts create at most one task per obligation.
- [ ] 4.4 Implement automatic themed-project capture and Inbox review candidates with source links; verify FYI/noise produce no tasks and one controlled live capture lands in its intended project.
- [ ] 4.5 Implement manual-edit preservation and completion/deletion suppressions; verify changed project/text/date fields survive synchronization and old mail cannot resurrect a completed or deleted task.
- [ ] 4.6 Add waiting/review visibility and sourced resolution suggestions; verify a sent reply can mark waiting, approval alone cannot complete a task, and unknown dates remain unset.
- [ ] 4.7 Document task ownership, label conventions, correction behavior, and replay recovery; verify the documented workflow against controlled mapped tasks without editing unrelated tasks.

## 5. Retro and planning inventory

- [ ] 5.1 Read Retro tasks and relevant comments as feedback; verify originals remain unchanged and broad accomplishment reports produce specific candidates with uncertainty.
- [ ] 5.2 Record a reviewed mapping of finite actions, reusable options, and broad goals from current Todoist inventory; verify rowing remains reusable and certification guidance produces bounded next steps.
- [ ] 5.3 Document how the planner consumes feedback and reconciliation suggestions; verify fixtures cover a reported setup accomplishment with several still-open tasks without blanket completion.

## 6. Drive publication and scheduled-task handoff

- [ ] 6.1 Implement the Markdown snapshot contract and dedicated stable Drive file; verify generation IDs, source/task links, sync timestamps, failures, and freshness-only publication on a no-new-mail cycle.
- [ ] 6.2 Implement recoverable publication and configurable freshness checks; verify failed publication leaves prior metadata intact and stale snapshots trigger explicit fallback behavior.
- [ ] 6.3 Save the existing Daily Inbox Digest and Daily Life Plan instructions and draft updated handoff instructions; verify each actual task context can retrieve the latest snapshot generation and live Todoist items before applying the updates.
- [ ] 6.4 Integrate Todoist inventory, waiting/review states, Retro, and calendar block themes into daily-task instructions; verify a Home & Admin example selects fitting actions and leaves optional inventory optional.
- [ ] 6.5 Document file ownership and rollback of the scheduled-task prompts; verify worker publication cannot overwrite existing plan/digest/retro artifacts and prior generated plans are not treated as completion evidence.

## 7. Five-minute operation

- [ ] 7.1 Add the launchd definition with explicit Node path, five-minute cadence, and PostgreSQL run locking; verify a controlled overlapping invocation skips duplicate write execution.
- [ ] 7.2 Implement bounded provider retries, failure diagnostics, and pending-work recovery; verify rate-limit, expired-credential, host interruption, and restart scenarios with sanitized output.
- [ ] 7.3 Document start/stop, retention, diagnosis, and restart procedures; verify stopping preserves mappings and resuming processes pending work without duplicate tasks.

## 8. End-to-end rollout evidence

- [ ] 8.1 Run the five-minute observation pilot and document chosen defaults and measured limitations; verify real sync freshness and zero Todoist/Gmail writes in observation mode.
- [ ] 8.2 Activate controlled automatic capture and complete a reply/waiting/manual-completion lifecycle; verify project routing, source linkage, correction preservation, and replay suppression end to end.
- [ ] 8.3 Observe one real Daily Inbox Digest and one Daily Life Plan run using the integration; verify latest-generation retrieval, appropriate block recommendations, and clear degraded-source reporting.
- [ ] 8.4 Exercise disable/re-enable and prompt rollback without deleting user tasks; deliver a release evidence report linking requirement scenarios to checks and list any remaining limitations before closing this change.
