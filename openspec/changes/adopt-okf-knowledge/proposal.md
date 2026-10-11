# Proposal

## Why

Jev's source, requirements, and operational decisions already span several folders. A curated OKF bundle makes critical rules discoverable before implementing the remaining processing milestones, and gives us a graph for reviewing their relationships.

## What Changes

- Add a self-contained `knowledge/` Open Knowledge Format v0.2 bundle with indexes, provenance, explicit delivery state, and linked concepts across product, architecture, providers, and operations.
- Point repository and nearby module documentation to relevant concepts; preserve source and OpenSpec as the authoritative implementation and requirements.
- Add offline validation, source-drift warnings, and an npm command that opens a local graph viewer using pinned Google reference-viewer assets and local libraries.
- Record the supplied Drive materials and official Google references without copying private material or credentials into the bundle.

## Capabilities

### New Capabilities

None. This change adds documentation and developer tooling; `.openspec.yaml` declares `skip_specs: true`.

### Modified Capabilities

None. Gmail polling, Todoist writes, classification, and deployment requirements remain in the existing change.

## Impact

Documentation, agent discovery instructions, development dependencies, offline checks, and new scripts/tests. No production SDK calls, database migrations, credentials, or scheduled worker behavior change.
