# Jev

Personal email preprocessing with TypeSafe AI's Jev: synchronize Gmail every five minutes, capture obligations in existing Todoist projects, and improve Daily Inbox Digest and Daily Life Plan using fresh Drive context and Retro feedback.

## Planning documents

- [Product requirements](docs/product-requirements.md): agreed outcomes, scope, system ownership, Todoist destinations, and acceptance criteria.
- [OpenSpec proposal](openspec/changes/add-personal-brief-preprocessing/proposal.md): the initial release change.
- [Architecture and design](openspec/changes/add-personal-brief-preprocessing/design.md): approved TypeScript structure and packages, runtime commands, testing/Git gates, synchronization, reconciliation, and deployment.
- [Implementation checklist](openspec/changes/add-personal-brief-preprocessing/tasks.md): eight milestones with verifiable tasks.
- [Capability specifications](openspec/changes/add-personal-brief-preprocessing/specs/): six behavior contracts with acceptance scenarios.

Section 1 foundation, [Gmail evidence retrieval](docs/gmail-preview.md), [manual durable ingestion](docs/mail-ingestion.md), and [manual incremental sync with expired-cursor recovery](docs/mail-sync.md) are implemented, along with [read-only diagnostics and a bounded observation procedure](docs/mail-observation.md). Sync resumes bootstrap/history discovery and durable retries while keeping evidence freshness separate. Live pilot acceptance, classification, scheduled deployment and the remaining release work remain planned. Use the checklist as the implementation progress record; completing planning artifacts does not mean the product is implemented.

Foundation: Node 24.21.0/TypeScript, Drizzle with pg, npm, Biome, Vitest/MSW, and Husky. Full offline checks run before commit, with fully staged validation inputs; PostgreSQL checks run before push and in PR CI. Required remote enforcement is tracked separately in the checklist. Native launchd scheduling comes in Section 7. Bun is deferred to another project.

Start with [development setup](docs/development.md), [independent connections](docs/connections.md), [Gmail preview](docs/gmail-preview.md), [migration operations](docs/migrations.md) and [foundation evidence](docs/foundation-evidence.md). Classification and task capture are later milestones.

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
