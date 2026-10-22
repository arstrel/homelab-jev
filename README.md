# Jev

Personal email preprocessing with TypeSafe AI's Jev: synchronize Gmail every five minutes, capture obligations in existing Todoist projects, and improve Daily Inbox Digest and Daily Life Plan using fresh Drive context and Retro feedback.

## Planning documents

- [Interactive flow and implementation status](https://www.tldraw.com/f/SdlFMrvVCtATHw1TUCpW3): the tldraw board covers the end-to-end flow, Gmail collection and ledger, reviewed task capture, and planned Drive/planner handoff. Boxes distinguish implemented capabilities (green), pending validation (orange), planned work (grey), existing systems (blue), and human decisions (purple). The diagram reflects merged PR #17; implemented manual commands do not imply unattended operation.
- [Product requirements](docs/product-requirements.md): agreed outcomes, scope, system ownership, Todoist destinations, and acceptance criteria.
- [OpenSpec proposal](openspec/changes/add-personal-brief-preprocessing/proposal.md): the initial release change.
- [Architecture and design](openspec/changes/add-personal-brief-preprocessing/design.md): approved TypeScript structure and packages, runtime commands, testing/Git gates, synchronization, reconciliation, and deployment.
- [Implementation checklist](openspec/changes/add-personal-brief-preprocessing/tasks.md): eight milestones with verifiable tasks.
- [Capability specifications](openspec/changes/add-personal-brief-preprocessing/specs/): six behavior contracts with acceptance scenarios.

Section 1 foundation, [Gmail evidence retrieval](docs/gmail-preview.md), [manual durable ingestion](docs/mail-ingestion.md), and [incremental sync with expired-cursor recovery](docs/mail-sync.md) are implemented, along with [read-only diagnostics and a bounded observation procedure](docs/mail-observation.md). The [live observation](docs/mail-observation-evidence.md) reached discovery catch-up and retained explicit evidence gaps. A [manual Jev triage preview](docs/mail-triage.md) inspects complete stored evidence without consuming jobs. The [manual Drive brief](docs/email-brief.md) saves and reuses typed judgments and publishes one source-linked private Markdown file. Complete collection acceptance, calibrated classification, reconciliation and the remaining release work remain planned. Use the checklist as the implementation progress record.

Foundation: Node 24.21.0/TypeScript, Drizzle with pg, npm, Biome, Vitest/MSW, and Husky. Full offline checks run before commit, with fully staged validation inputs; PostgreSQL checks run before push and in PR CI. Required remote enforcement is tracked separately in the checklist. Bun is deferred to another project.

The small [reviewed email task flow](docs/email-tasks.md) now proposes source-based titles and existing Todoist projects from up to ten stored conversations, and creates only explicitly approved candidates. Automatic capture and full reconciliation remain later milestones.

[Five-minute collection tooling](deploy/README.md) installs the existing Gmail sync as a native launchd agent using an isolated compiled release. Use `npm run worker -- --help` for install/start/stop/status commands. Activation requires a merged release; [operational evidence](docs/mail-worker-evidence.md) distinguishes tooling from live scheduled acceptance.

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

Start at the [knowledge index](knowledge/index.md) for linked product rules, architecture invariants, provider contracts and runbooks. See [adoption and maintenance](docs/okf-adoption.md) for sources, coverage and SSH viewing.

```sh
npm run okf:visualize
```

This opens the local concept graph. Use `npm run okf:check` to validate and `npm run okf:build` to generate the portable HTML. New concepts remain draft and unverified until reviewed.
