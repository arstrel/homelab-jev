# Jev

Personal email preprocessing with TypeSafe AI's Jev: synchronize Gmail every five minutes, capture obligations in existing Todoist projects, and improve Daily Inbox Digest and Daily Life Plan using fresh Drive context and Retro feedback.

## Planning documents

- [Product requirements](docs/product-requirements.md): agreed outcomes, scope, system ownership, Todoist destinations, and acceptance criteria.
- [OpenSpec proposal](openspec/changes/add-personal-brief-preprocessing/proposal.md): the initial release change.
- [Architecture and design](openspec/changes/add-personal-brief-preprocessing/design.md): approved TypeScript structure and packages, runtime commands, testing/Git gates, synchronization, reconciliation, and deployment.
- [Implementation checklist](openspec/changes/add-personal-brief-preprocessing/tasks.md): eight milestones with verifiable tasks.
- [Capability specifications](openspec/changes/add-personal-brief-preprocessing/specs/): six behavior contracts with acceptance scenarios.

Planning is drafted. Implementation has not started. Use the checklist as the implementation progress record; completing planning artifacts does not mean the product is implemented.

Approved foundation: Node 24/TypeScript, native launchd scheduling, Drizzle with pg, npm, Biome, Vitest/MSW, and Husky. Full offline checks run before commit, with fully staged validation inputs; PostgreSQL checks run before push and in required PR CI. These commands, hooks, and CI settings are planned and have not yet been installed or configured. Bun is deferred to another project.

## OpenSpec tracking

Run from `/Users/artem/source/jev` with the project's Node 24 runtime:

```sh
nvm use 24
openspec list
openspec status --change add-personal-brief-preprocessing
openspec validate add-personal-brief-preprocessing --strict
```

The machine's Node 24 installation is `/Users/artem/.nvm/versions/node/v24.21.0/bin`; prepend it to PATH if the shell selects the older system Node.
