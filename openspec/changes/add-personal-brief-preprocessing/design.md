# Design

## Context

See [proposal.md](proposal.md) for motivation and scope. The workspace has OpenSpec, AGENTS.md, `.nvmrc` targeting Node 24, and an ESM npm package with the TypeSafe AI, Todoist, and Google SDKs installed, but no application code or tests. The repository is `arstrel/homelab-jev`. The user has provided environment variable names for Jev and PostgreSQL; secret values have not been inspected. Existing Docker containers were observed using PostgreSQL 17 Alpine and Redis 7 Alpine; application connectivity remains to be verified.

The user approved Node 24 with launchd, Drizzle with pg, the folder structure and package choices below, short-lived branches with required PR CI, full offline checks before commit, PostgreSQL tests before push and in CI, and fully staged application/configuration changes. Bun and Kysely were considered; Node and Drizzle were selected for this project. These are agreed choices, while the pilot defaults called out below remain tunable.

On October 4, 2026, Todoist inspection found seven themed projects, Inbox, Retro, no sections, and an `Assistant` label. Tasks include finite actions, reusable activity options, and broad goals. The daily scheduled chats already produce Markdown artifacts in Drive, but the current prompts and reliable latest-snapshot retrieval still need a targeted integration check.

## Goals / Non-Goals

**Goals:**
- Keep business state in Todoist and processing state in PostgreSQL, with explicit ownership of every write.
- Make retries and overlapping runs harmless, including ambiguous outcomes from remote task creation.
- Keep the preprocessing worker independent of GPT scheduling, with an observable freshness contract at the boundary.

**Non-Goals:**
- Running GPT for every incoming email or requiring a GPT API key for the first worker.
- Replacing the daily planner, adding a new task UI, or requiring Redis for a single worker.
- Inferring exact deadlines, making calendar changes, or automatically completing tasks from ambiguous mail or Retro.

## Decisions

### 1. One TypeScript worker scheduled every five minutes

Use Node.js 24 and TypeScript, using the official TypeSafe SDK and supported Google/Todoist APIs. Use a one-shot launchd job with explicit working directory, Node binary, environment-file path, and five-minute cadence. This avoids the older system Node encountered during setup. Pin the same reviewed Node patch in development, CI, and deployment during foundation work. A PostgreSQL advisory lock prevents overlapping runs. Use bounded retries and process pending work on startup; a timer is not a delivery guarantee while the mini is offline.

Hold the run lock on one dedicated pg connection for the cycle's lifetime; never return that connection to the pool while it owns the lock. An overlapping invocation exits successfully with a visible skipped-run reason. Apply an overall cycle deadline and provider timeouts, handle termination signals, and close connections in a finally path. Persist unfinished work before exit. Keep remote requests outside database transactions, and coordinate SDK/application retries so the total attempt and time budgets remain bounded.

Alternatives: hourly polling is too stale for the approved cadence; Gmail push/Pub/Sub was explicitly declined. A GPT scheduled run for each synchronization adds unnecessary model orchestration. Dockerizing the worker can be considered later without changing its contracts. Bun's integrated tooling was discussed and deferred to another project; this application's runtime and tests use Node.

### 2. Incremental ingestion with durable pending work

Bootstrap a bounded recent-mail window and retrieve relevant full threads; proposed default is the last 30 days, configurable for the pilot. Include relevant incoming and sent messages, not just unread inbox mail. Use Gmail history to ingest subsequent changes. Persist fetched records and pending jobs before advancing the ingestion checkpoint; classification failures remain retryable even after the checkpoint moves. Exhaust history pagination before committing its final checkpoint. An expired history cursor triggers bounded recovery plus re-fetching threads linked to open tasks.

A message or changed thread is processed only when its relevant source fingerprint or decision-policy version changes. Read-state and our own label changes alone do not create new obligations. An unseen older thread can be fetched when a new reply makes it relevant; full inbox backfill remains a later change.

### 3. PostgreSQL as an operational ledger

Use a dedicated Jev schema or database in the existing PostgreSQL deployment, without changing unrelated data. Conceptual records:

| Record | Purpose |
| --- | --- |
| Mailbox checkpoints | Last ingested Gmail history and successful sync time |
| Source records and pending jobs | Minimal source context, fingerprint, processing status, retries |
| Classification results | Model/policy version, typed answers, probabilities, confidence, corrections |
| Source-to-task links | Stable obligation key, Gmail evidence IDs, Todoist task ID, user overrides |
| Write intents | Recoverable Todoist and Drive operations with request identity and outcome |
| Publication state | Drive file ID, snapshot generation, publish time, source freshness |

Todoist owns task text, project, dates, and completion. PostgreSQL caches those fields only for reconciliation; it does not serve a competing editable task list. Redis is optional for future workload needs, not part of initial correctness.

Use Drizzle's SQL-shaped query API over pg. Keep table definitions and inferred row types in the PostgreSQL adapter, and generate versioned SQL migrations with drizzle-kit. Commit and review the SQL plus migration metadata; apply migrations explicitly as a deployment step, never on each five-minute cycle. Do not use schema push in production. Use parameterized SQL where database primitives such as advisory locks need it. Test constraints, transactions, and migration behavior against PostgreSQL rather than treating TypeScript types as database guarantees.

Kysely plus pg would also support this ledger. Drizzle was selected for the shared TypeScript schema, inferred types, and SQL migration generation in a greenfield schema. Model-instance behavior from a traditional ORM is unnecessary. Do not combine Drizzle and Kysely. Document recovery through a tested restore or reviewed forward repair; do not assume automatically generated reverse migrations exist.

### 4. Narrow Jev judgments and deterministic policy

Send only the relevant message, thread excerpts, candidate existing tasks, and allowed project descriptions. Keep trusted question criteria separate from email data. Ask independent questions for message kind, required attention, obligation match, lifecycle evidence, and project choice. Include unknown/none outcomes. Validate typed answers; compare dates and calculate freshness in code.

Choose project IDs from an allowlist refreshed from Todoist; never interpret an email-supplied project name as a command. Calibrate separate thresholds for actionable-item detection, matching, and routing against corrected representative examples. Threshold values and a pinned supported model are implementation settings to select from measured results, not approved numerical guarantees.

Jev does not generate prose. In the first release, task titles combine a supported action template (for example, Reply to or Review) with source text such as subject/sender. Preserve source excerpts in descriptions. Complex multi-action messages become review candidates rather than invented subtasks. Free-form extraction or GPT-generated titles are optional future extensions.

### 5. Reconcile before creating Todoist tasks

Read Todoist changes each cycle. Match exact source mappings first, then deterministic references (such as repository plus PR number), then Jev-selected candidates. A Gmail thread can contain multiple obligations; use a stable thread/reference plus action fingerprint as the obligation key, not thread ID alone. A task can have evidence from multiple threads.

Capture confidently actionable, confidently routed items in themed projects. Put actionable candidates with uncertain routing or wording in Inbox, marked for review. Keep FYI/noise in digest data without task creation. Proposed labels are `Assistant` for origin, `waiting` for blocked-on-others, and `needs-review` for ambiguity; confirm their conventions against existing planner behavior during the pilot. Labels are not proof of ownership: manage only mapped tasks and never take over unrelated tasks carrying the same label.

Attach source links and a durable source marker to newly managed tasks. Persist a write intent before making a remote request, use the API's supported idempotency facility where available, and reconcile markers after an ambiguous timeout before any retry. Updating new evidence must not generate duplicates or recurring comments every five minutes.

Manual task title, project, dates, and completion override worker proposals. Preserve manually edited descriptions/labels and update only the worker-owned evidence portion. Moving a task supplies a routing correction. Completion or deletion suppresses replay of the same old obligation; a genuinely new request requires new evidence and a separate key. Completion is explicit user state; inferred email resolution is recorded as a suggestion for the planner/user in release one.

### 6. Retro and activity inventory inform the planner

Retro is a feedback input, excluded by project ID from routing. Preserve its content and existing archive workflow. Match specific self-reports to candidate tasks and surface reconciliation suggestions with evidence, without automatically closing broad sets of setup steps.

Distinguish finite actions, reusable activity options, and broad goals in planner context. Begin with known examples and an explicit reviewed mapping; avoid rewriting existing tasks to encode this distinction. Reusable activities stay available after a recorded session. Goals guide selection of a concrete next step. Retro statements about preference, workload, and completed work inform planning but are not medical or scheduling directives generated by the worker.

### 7. Drive snapshot as a one-way handoff

The worker owns a dedicated `jev-current.md` file addressed by stable Drive file ID. Publish after a successful processing cycle, including freshness-only updates when no mail changed, using a versioned snapshot generation; retry failed publication without fabricating freshness. Include the last successful Gmail/Todoist syncs, pending failures, new actions, waiting tasks, resolution suggestions, uncertain cases, and source/task links. Keep detailed email bodies out of the snapshot unless needed as short evidence.

The daily tasks read that snapshot and live Todoist; Calendar supplies upcoming block times/themes and existing Drive artifacts supply context. Drive is a readable export, not a task authority. Do not feed yesterday's generated digest back into the ledger as independent evidence. The worker does not edit GPT-owned plans, digests, or retrospectives.

Proposed freshness default: flag the handoff as stale when the last successful required source sync is more than 15 minutes old. Measure actual scheduling behavior and make this configurable. Each scheduled task must retrieve the current file generation in a real test, rather than relying on search indexing or assuming local access. If stale/unavailable, explicitly fall back to live connected sources where available and identify remaining gaps. Periodic scheduling has a race window; include an extra refresh before the known morning runs once their actual times are verified.

### 8. Independent credentials and minimal stored content

The worker reads its Jev key from local configuration and obtains its own Google OAuth authorization and Todoist token/OAuth grant. ChatGPT connections remain separate. Start with Gmail read access and permissions for the dedicated Drive outputs and Todoist actions needed by the pilot. Never commit or log credentials; avoid logging raw message bodies. Exclude secret files before introducing source control. Verify provider API scopes and retry/idempotency semantics during adapter work.

Retain mappings, suppressions, and decisions needed for replay safety. Proposed pilot default: retain raw source excerpts for 30 days, then re-fetch when needed; retain sanitized evaluation fixtures/corrections and minimal provenance for active tasks. Document retention and ensure credentials are not included in backups or sample fixtures.

The user-provided names are `JEV_API_KEY`, `DB_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Use `DB_URL` as the authoritative connection configuration when present; otherwise require and validate the individual DB fields. Zod validates the selected configuration without printing values or connection strings. Load the environment explicitly for operational commands using Node's environment-file support; help/version and offline checks require no secret file. Google and Todoist authorization remains separate configuration to document during adapter work. Tests supply their own fake provider settings and isolated database connection and never load the project's `.env`.

### 9. A small CLI with explicit module boundaries

Use a composition root to wire providers and repositories into the application. The domain contains pure decisions and policy, the application coordinates the processing cycle through ports, and adapters translate provider/database responses into internal types. Keep SDK types out of domain interfaces. Inject clocks, ID generation, and providers so behavior is deterministic in tests. No HTTP server, dependency-injection framework, or queue service is needed initially.

Approved layout, with filenames as implementation guidance:

```text
src/
  cli.ts
  config.ts
  application/
    ports.ts
    run-cycle.ts
  domain/
    classification.ts
    obligations.ts
    routing.ts
    snapshots.ts
  adapters/
    gmail.ts
    jev.ts
    todoist.ts
    drive.ts
    postgres/
      schema.ts
      repositories.ts
  observability/
    logger.ts
migrations/
tests/
  unit/
  adapters/
  integration/
  fixtures/
scripts/
deploy/
.github/workflows/
```

Use ESM, NodeNext module/resolution settings, strict TypeScript, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noEmitOnError`. Use relative imports that resolve in the compiled output, with no runtime path-alias loader. Compile production code with tsc into a separate output directory; use tsx for development. Give tests/scripts a checking configuration if they sit outside the production compilation roots. A no-network CLI smoke check exercises the compiled entry point.

### 10. Packages and reproducible commands

| Purpose | Approved packages |
| --- | --- |
| Providers, already installed | `@typesafe-ai/sdk`, `@doist/todoist-sdk`, `googleapis` |
| PostgreSQL | `pg`, `drizzle-orm` |
| Configuration and structured logging | `zod`, `pino` |
| TypeScript development | `typescript`, `tsx`, `@types/node`, `@types/pg` |
| Migration generation | `drizzle-kit` |
| Offline tests and coverage | `vitest`, `@vitest/coverage-v8`, `msw` |
| Formatting, linting, and imports | `@biomejs/biome` |
| Git hooks | `husky` |
| Portable spec validation | Local `@fission-ai/openspec` development dependency |

Use npm and commit package-lock.json. Pin reviewed direct dependency/tool versions during foundation setup and install with npm ci in CI and release preparation. Provider and migration-tool upgrades are reviewed changes with their relevant contract/database checks. Redis, an application bundler, dotenv, and another lint/format stack are unnecessary initially.

Biome owns formatting, recommended lint rules, and import organization. Set explicit style choices in one committed configuration. A developer fix command may use `biome check --write`; hooks/CI only check and never rewrite files. TypeScript checks remain a separate step.

Planned command contract; these commands do not exist yet:

| Command | Behavior |
| --- | --- |
| `npm run dev -- cycle --mode observe` | Run a one-shot development cycle with tsx |
| `npm run build` | Compile the production application with tsc |
| `npm start -- cycle --mode observe` | Run the compiled one-shot observation cycle |
| `npm start -- cycle --mode capture` | Run the compiled task-capture cycle after pilot activation |
| `npm start -- status` | Report source freshness, pending work, and publication status |
| `npm run db:generate` | Generate SQL migration files for review without applying them |
| `npm run db:migrate` | Explicitly apply reviewed migrations to the configured operational database |
| `npm run check` | Run the canonical, full offline validation gate |
| `npm run test:integration` | Run database integration checks with isolated test configuration |
| `npm run fix` | Apply developer-requested safe Biome fixes |

### 11. Deterministic tests with separate live evaluation

Use Vitest for pure domain/application tests with fixed clocks and IDs, reset fakes, explicit timezone, and sanitized fixtures. Use MSW for adapter HTTP contracts, including pagination, rate limits, malformed results, and a lost response after a remote write. Unhandled external requests fail tests. Hooks/CI do not require live Gmail, Todoist, Drive, or Jev access, and test configuration does not inherit production secrets. Do not rely on test order or random live model responses.

Database tests run on disposable PostgreSQL 17 instances with a pinned image, dummy credentials, and an explicit test-only URL. A local helper starts an isolated Docker test instance; CI provides a service instance. The test command validates its test target and refuses the operational DB settings. Cover migration replay/upgrades, unique constraints, transaction rollback, advisory-lock ownership, and recovery of pending/ambiguous writes. Block external provider requests while allowing the isolated database. Destroy test data through the test harness only.

Collect coverage for untested branches, especially replay, suppression, manual edits, and failure recovery. Avoid an arbitrary global percentage or tests that only mirror scaffolding. New behavior lands with meaningful tests in its own milestone. Fail on accidentally empty test selection. Live Jev calibration and controlled end-to-end provider checks use separate explicit commands and never run as deterministic Git gates.

### 12. Git hooks and required PR validation

Use short-lived branches and PRs. Install Husky hooks during normal developer setup; CI uses the same canonical scripts independently. Pre-commit runs the full `npm run check`: non-mutating Biome checks, application/test/script type checks, all offline unit and HTTP-contract tests, production compilation, a no-network compiled CLI smoke check, and strict OpenSpec validation with telemetry disabled. Validate committed local planning-document links as part of the documentation checks. Do not reduce this gate to changed-file tests or add automatic stashing.

Before pre-commit checks, require the Git index and working tree to match for every validation input. Reject partial staging, unstaged tracked changes, and non-ignored untracked files that can affect those checks. Maintain the input scope alongside the scripts: source, tests/fixtures, migrations, tooling scripts, deploy/CI configuration, package/lock files, TypeScript/Biome/test/runtime configuration, OpenSpec, and checked planning documents. Ignored secrets and generated output are excluded. Report the relevant paths with staging instructions, never stage them automatically. Check input content again after validation and reject mutations so the tested content is what gets committed.

Pre-push runs offline validation and PostgreSQL integration tests. For the initial workflow it verifies that each non-deletion pushed commit is the current HEAD and that validation inputs match that commit, including no relevant untracked files. Reject a different target or dirty inputs with instructions to check out the target, clean the checked inputs, and push separately; never claim tests covered a different commit. CI remains mandatory because local hooks can be bypassed.

GitHub Actions runs npm ci and the same offline gate plus a PostgreSQL integration job on PRs and branch pushes. Check the workflow's actual checked-out revision, use read-only repository permissions, pin third-party actions to reviewed commit SHAs, and set timeouts. Personal provider secrets are unnecessary; use hosted runners rather than exposing the Mac mini to PR execution. Configure a repository rule/protection requiring the PR checks before merge, subject to the repository account's available features; verify enforcement and document any limitation before claiming it is active. Automated deployment on push is outside the initial workflow.

### 13. Reviewed native releases

Prepare a release from a reviewed commit with the pinned runtime, lockfile installation, checks, and compiled output. Install into a dedicated immutable release directory with its commit/version recorded; launchd invokes that compiled entry point using explicit paths and a separate secret file. Do not run production from the editable development checkout.

Apply reviewed migrations explicitly, then switch a stable release pointer and verify status plus a controlled observation cycle. Retain the previous release for code rollback, checking schema compatibility before switching back. Database recovery follows the tested migration/backup procedure, not automatic destructive reversal. Keep retries, source mappings, user tasks, and Drive ownership intact. Document deployment manually first; a release automation pipeline can be a later change.

## Risks / Trade-offs

- Wrong action/routing judgment -> Separate thresholds, corrected examples, explicit unknown outcomes, and review candidates.
- Duplicate tasks after uncertain remote writes -> Durable write intents, source markers, supported request identities, and reconciliation before retries.
- Manual edits overwritten -> Todoist field ownership and mapped-task-only updates with tested merge behavior.
- Mini outage or API failure -> Durable jobs, bounded retries, recovery sync, and honest freshness in the snapshot.
- Stale Drive retrieval -> Stable file ID and generation checks in actual scheduled runs; live-source fallback.
- Todoist backlog inflation -> Create concrete obligations, retain optional ideas as optional, and report corrections/noise capture during the pilot.
- Sensitive mail sent to hosted Jev -> Minimize state and define excluded source categories before running the real-data pilot.
- Local hooks test a different tree or are bypassed -> Require fully staged validation inputs, check for mutation, verify pushed targets, and enforce the same gates in PR CI.
- Tests touch operational data -> Use isolated test configuration and disposable PostgreSQL instances, never the project environment file.
- Runtime/dependency drift or editable checkout deployment -> Pin versions, install from the lockfile, and deploy reviewed compiled releases.

## Migration Plan

1. Establish the application, package, testing, hook, and CI foundation in task group 1 before feature work. Verify connectivity to existing PostgreSQL, supported APIs, and the two actual scheduled-task contexts. Preserve the current task prompts for rollback.
2. Add isolated Jev storage and run one-shot read-only ingestion/classification on a bounded sample. Report results and corrections.
3. Start the five-minute observation schedule and verify recovery/replay behavior without Todoist writes.
4. Enable mapped task creation/routing in the existing projects and Inbox; verify human edits and duplicate prevention.
5. Publish and read back the dedicated Drive snapshot, then update daily-task instructions and observe real executions.
6. For rollback, disable the worker and restore prior task prompts. Keep existing Todoist tasks and Drive artifacts accessible; retain ledger mappings so restarting does not duplicate them. Never bulk-delete tasks as rollback.

## Open Questions

- Deployment-specific values: PostgreSQL connection/schema name, launchd label, Google client registration, Todoist worker credential, Drive folder/file IDs, and actual morning run times.
- Pilot configuration: supported pinned Jev model, measured thresholds, initial 30-day window, raw-excerpt retention, and 15-minute freshness cutoff. These are documented defaults to tune without changing capability contracts.
- Naming of waiting/review labels and the reviewed task-kind mapping, checked against current planner conventions before enabling the relevant writes.

## References

- [Gmail incremental synchronization](https://developers.google.com/workspace/gmail/api/guides/sync)
- [TypeSafe primitives](https://docs.typesafe.ai/introduction)
- [Jev documented limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13)
- [Scheduled tasks and connected sources](https://learn.chatgpt.com/docs/automations)
- [macOS timed jobs](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html)
- [Drizzle migration workflow](https://orm.drizzle.team/docs/migrations)
- [Biome setup and checks](https://biomejs.dev/guides/getting-started/)
- [Husky setup](https://typicode.github.io/husky/get-started.html)
- [Vitest coverage](https://vitest.dev/guide/coverage.html)
- [MSW Node integration](https://mswjs.io/guides/integrations/node)
- [PostgreSQL services in GitHub Actions](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers)
