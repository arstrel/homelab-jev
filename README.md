# Jev

Personal email preprocessing with TypeSafe AI's Jev: synchronize Gmail every five minutes, capture obligations in existing Todoist projects, and improve Daily Inbox Digest and Daily Life Plan using fresh Drive context and Retro feedback.

## Planning documents

- [Product requirements](docs/product-requirements.md): agreed outcomes, scope, system ownership, Todoist destinations, and acceptance criteria.
- [OpenSpec proposal](openspec/changes/add-personal-brief-preprocessing/proposal.md): the initial release change.
- [Architecture and design](openspec/changes/add-personal-brief-preprocessing/design.md): synchronization, task reconciliation, credentials, handoff, and rollout.
- [Implementation checklist](openspec/changes/add-personal-brief-preprocessing/tasks.md): eight milestones with verifiable tasks.
- [Capability specifications](openspec/changes/add-personal-brief-preprocessing/specs/): six behavior contracts with acceptance scenarios.

Planning is drafted. Implementation has not started. Use the checklist as the implementation progress record; completing planning artifacts does not mean the product is implemented.

## OpenSpec tracking

Run from `/Users/artem/source/jev` with Node 20.19.0 or newer:

```sh
openspec list
openspec status --change add-personal-brief-preprocessing
openspec validate add-personal-brief-preprocessing --strict
```

The machine's Node 24 installation is `/Users/artem/.nvm/versions/node/v24.21.0/bin`; prepend it to PATH if the shell selects the older system Node.
