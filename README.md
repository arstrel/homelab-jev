# Jev

Personal email preprocessing with TypeSafe AI's Jev: synchronize Gmail every five minutes, capture obligations in existing Todoist projects, and improve Daily Inbox Digest and Daily Life Plan using fresh Drive context and Retro feedback.

## Planning documents

- [Interactive flow diagram](https://www.tldraw.com/f/SdlFMrvVCtATHw1TUCpW3): historical PR #17 architecture snapshot. Its implementation colors predate current deployment; use [current progress](docs/product-requirements.md#progress-tracking) and the checklist for delivery status.
- [Product requirements](docs/product-requirements.md): agreed outcomes, scope, system ownership, Todoist destinations, and acceptance criteria.
- [OpenSpec proposal](openspec/changes/add-personal-brief-preprocessing/proposal.md): the initial release change.
- [Architecture and design](openspec/changes/add-personal-brief-preprocessing/design.md): approved TypeScript structure and packages, runtime commands, testing/Git gates, synchronization, reconciliation, and deployment.
- [Implementation checklist](openspec/changes/add-personal-brief-preprocessing/tasks.md): eight milestones with verifiable tasks.
- [Capability specifications](openspec/changes/add-personal-brief-preprocessing/specs/): six behavior contracts with acceptance scenarios.

Five-minute Gmail collection, [automatic classification](docs/automatic-mail-classification.md), private [Drive publication](docs/email-brief.md) and the [scheduled daily-task handoff](docs/scheduled-brief-evidence.md) are deployed. The [create-only Todoist capture pilot](docs/automatic-capture-evidence.md) is enabled with bounded matching and preserved user tasks. [Current progress](docs/product-requirements.md#progress-tracking) separates implementation, live acceptance and remaining work: useful real capture, calibration, review/correction handling and lifecycle reconciliation are still incomplete.

Foundation: Node 24.21.0/TypeScript, Drizzle with pg, npm, Biome, Vitest/MSW, and Husky. Full offline checks run before commit, with fully staged validation inputs; PostgreSQL checks run before push and in PR CI. Required remote enforcement is tracked separately in the checklist. Bun is deferred to another project.

The [manual reviewed task flow](docs/email-tasks.md) remains available for explicit candidate approval. Automatic capture is a separate enabled pilot; full reconciliation remains unfinished.

[Five-minute collection](deploy/README.md) runs as a native launchd agent using an isolated compiled release. Use `npm run worker -- --help` for install/start/stop/status commands. [Operational evidence](docs/mail-worker-evidence.md) records activation; later [catch-up/no-change evidence](docs/mail-observation-evidence.md#october-25-catch-up-and-no-change-acceptance) closes the former freshness gap.

Publish a bounded email, Todoist and Retro brief after building:

```sh
npm run brief:publish -- --max-conversations 10 --days 7 --max-new 10
# Include optional typed Retro review within the same new-call allowance:
npm run brief:publish -- --max-new 20 --retro-review
# Reuse saved email judgments and refresh source context without new Jev calls:
npm run brief:publish -- --max-new 0
```

This prints the confirmed Drive link. Each run also reads current Todoist projects/open tasks, excludes Retro from the action inventory, adds recent Retro feedback separately and marks email actions with an explicit existing task source link as already tracked. [Optional Retro review](docs/retro-brief.md) distinguishes finite actions, reusable activities and broad goals, with source-linked suggestions for human review. It does not change tasks, Gmail read state, or scheduled prompts. See [brief publication and recovery](docs/email-brief.md) for configuration, caps and coverage limits.

Start with [development setup](docs/development.md), [independent connections](docs/connections.md), [Gmail preview](docs/gmail-preview.md), [migration operations](docs/migrations.md) and [foundation evidence](docs/foundation-evidence.md).

## OpenSpec tracking

Run from `/Users/artem/source/jev` with the project's Node 24 runtime:

```sh
nvm use 24
openspec list
openspec status --change add-personal-brief-preprocessing
openspec validate add-personal-brief-preprocessing --strict
```

The machine's Node 24 installation is `/Users/artem/.nvm/versions/node/v24.21.0/bin`; prepend it to PATH if the shell selects the older system Node.

## OKF knowledge

Browse the [OKF knowledge graph](https://arstrel.github.io/homelab-jev/) on GitHub Pages. The site updates after merges to `main`; its first live deployment and concept navigation were verified October 25.

Start at the [knowledge index](knowledge/index.md) for linked product rules, architecture invariants, provider contracts and runbooks. See [adoption and maintenance](docs/okf-adoption.md) for sources, coverage and SSH viewing.

```sh
npm run okf:visualize
```

This opens the local concept graph. Use `npm run okf:check` to validate and `npm run okf:build` to generate the portable HTML. New concepts remain draft and unverified until reviewed.

The [regular brief refresh and scheduled-task handoff](docs/scheduled-brief-handoff.md) connects the private Drive context to existing daily routines. See [deployment](deploy/brief-refresh.md) and [verification evidence](docs/scheduled-brief-evidence.md).

The [automatic Todoist capture pilot](docs/automatic-todoist-capture.md) adds optional matching and capped task creation while preserving existing tasks. The [deployment evidence](docs/automatic-capture-evidence.md) records classifier and capture activation, real timer checks and the still-unverified useful-capture outcome.
