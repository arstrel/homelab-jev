# Development foundation

Use Node **24.21.0**, npm and the committed lockfile. The same `.nvmrc` governs development and CI. The application is native ESM/NodeNext TypeScript, compiled with tsc; development uses tsx. Bun is deferred. Provider SDKs, Drizzle/pg, Zod, Pino, Biome, Vitest/MSW, Husky and OpenSpec are exact direct dependency versions in package.json.

## Clean setup

```sh
git clone https://github.com/arstrel/homelab-jev.git
cd homelab-jev
nvm install
nvm use
npm ci
npm run check
npm run test:integration
```

Offline checks need neither `.env` nor personal credentials. The database command additionally needs a running Docker daemon and the pinned PostgreSQL image (first use can download it). `npm ci` installs Husky through `prepare`; `git config --get core.hooksPath` should show `.husky/_`. Run `nvm use` before Git commands so hooks use the project runtime. CI deliberately disables local hook installation and calls the same checks independently.

## Commands

| Command | Contract |
| --- | --- |
| `npm run dev -- --help` | Development CLI through tsx |
| `npm run build` | Remove generated dist and compile production code |
| `npm start -- --help` / `--version` | Compiled CLI, no credentials or network |
| `node --env-file=.env dist/cli.js status` | Read ledger counts and an actual check timestamp; requires applied schema |
| `npm run db:check` | Bounded read-only operational PostgreSQL connectivity check |
| `npm run db:generate` | Generate SQL and metadata for review; no connection needed |
| `npm run db:migrate` | Explicitly apply reviewed migrations using `.env`; no implicit schema push |
| `npm run connections` | Bounded read-only Jev, Todoist and Google authorization checks |
| `npm test` | All offline unit/application and MSW contract tests |
| `npm run test:coverage` | Offline tests with V8 branch coverage for review |
| `npm run typecheck` | Strict checking of application, tests, scripts and TS configuration |
| `npm run check` | Canonical non-mutating validation of repository inputs |
| `npm run test:integration` | Disposable PostgreSQL migration and repository checks |
| `npm run fix` | Explicit developer-requested safe Biome fixes; review and stage the changes |
| `npm run verify:foundation` | Slower clean-install and fault-injection evidence in a disposable checkout; requires populated `/private/tmp/jev-npm-cache` |

`cycle --mode observe/capture` is a future command from Sections 2–7. It currently exits unsuccessfully instead of claiming to process mail. No launchd job is installed by this milestone. Status reports foundation ledger counts, not fabricated source freshness or publication success.

## Boundaries

The CLI composes application ports with adapters. `src/domain/` is reserved for pure policy. Application ports contain internal types, with injected clocks and IDs. Google/Jev/Todoist SDKs remain inside adapters; PostgreSQL schema and inferred storage rows remain inside its adapter. Future workflow orchestration must translate those rows into domain types. `deploy/` holds later native release and launchd configuration. This milestone establishes storage and connection checks, without email classification, task capture or Drive publication.

Configuration is explicit: `DB_URL` is authoritative whenever present, including when invalid; otherwise all `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` fields are required. Jev uses `JEV_API_KEY`. The configuration module has no environment-file side effects. [Connection setup](connections.md) covers independent provider authorization. Logs accept fixed event dimensions, never arbitrary error objects or configuration. Diagnostics name invalid fields without printing values.

## Canonical validation and inputs

`npm run check` verifies the exact Node patch, Biome formatting/recommended lint/import organization, all TypeScript, all offline tests, a clean production build, compiled help/version with network functions blocked, local Markdown links and strict validation of this OpenSpec change using the pinned local CLI with telemetry disabled. It never formats, stages or stashes checked files. Generated `dist/` and coverage are excluded outputs. Unexpected HTTP requests fail under MSW; inherited operational credentials are removed by command wrappers and direct test invocations reject them. Environment-file loading is forbidden inside tests. Fixtures use fake credentials and explicit fixed clocks/IDs.

Every tracked and non-ignored untracked repository file is a validation input, except generated `dist/`, coverage, dependencies and Husky internals. This includes source, tests/fixtures, migrations/metadata, scripts, deployment, workflows/hooks, runtime/package/lock/tool configuration, OpenSpec, local skills, README and all other documentation. The complete Git file set prevents a newly introduced tool/configuration from escaping the guard. `.env` and `.env.*` are ignored, except the tracked dummy `.env.example`.

Pre-commit requires index and worktree to match for all inputs. Pre-push requires every non-deletion target SHA to equal HEAD and all inputs to match HEAD. Both gates reject relevant untracked files and recheck a content/index/HEAD fingerprint after checks; no automatic fixing, staging or stashing occurs. Commit runs all offline checks; push also runs PostgreSQL tests. Stage only reviewed paths explicitly. If pushing a different revision, check it out in a clean checkout and push separately. Hooks can be bypassed, so required remote checks are a separate gate.

## Disposable PostgreSQL

The local helper creates a uniquely named, labelled PostgreSQL 17 container, binds a random port on `127.0.0.1`, waits for readiness and removes it in a finally handler, including test failures and handled termination. No persistent volume is created. Tests only accept `jev_test` database/user/password at a loopback host, an explicit port and `JEV_TEST_DATABASE=disposable`, with no operational DB/provider settings. This marker is an operator assertion, not permission to reuse a real database. CI uses a disposable PostgreSQL service with the same dummy settings. SIGKILL cannot execute cleanup; remove an orphan by its `jev-tests-` name after verifying the `jev.test=true` label.

Tests cover migration fresh/repeat apply, prior-version upgrade, transactional failed-migration repair, unrelated schema preservation, atomic checkpoint ingestion, duplicate constraints, rollback, classification/task-link storage, suppressions, ambiguous write persistence and dedicated advisory-lock ownership. [Migration operations](migrations.md) explains deployment and recovery. Runtime scheduling/lock orchestration belongs to Section 7.

## Branches, CI and updates

Start a short-lived branch from updated main, commit after offline checks, push after the database gate and open a PR. Hosted GitHub runners install with `npm ci` and report `Offline checks` and `PostgreSQL checks` on their checked-out revision. Workflows use read-only repository permissions, pinned action SHAs and no personal provider secrets. PR checkout is GitHub's merge revision by default. Deployment is manual and separate.

Required-check enforcement must be enabled on main with both job names and no administrative bypass, then verified on a failing PR before calling task 1.9 complete. A fine-grained GitHub token needs repository-scoped Workflows read/write to publish workflow changes and Administration read/write to configure branch protection. Account/token limitations and actual evidence are recorded in [foundation evidence](foundation-evidence.md).

Update direct packages intentionally with exact versions and the lockfile. Review `npm audit`, upstream release notes, generated SQL changes and the relevant SDK/database tests. Never run blind `npm audit fix --force`; it currently suggests unrelated older major versions of OpenSpec/Drizzle. Dependency findings and limitations are recorded in the evidence report. Review coverage to choose meaningful new behavior tests; no arbitrary global percentage replaces scenario checks.
