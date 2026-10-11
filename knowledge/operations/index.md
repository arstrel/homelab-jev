# Operations

- [Node development and Git gates](development-gates.md): Use exact pinned tooling and checks over the full staged validation input set. (implemented).
- [Offline and database test isolation](test-isolation.md): Tests must not consume live credentials or mutate the homelab database. (implemented).
- [Explicit database migrations](database-migrations.md): Apply reviewed migrations only to the worker-owned schemas with rollback preparation. (implemented).
- [Configuration and private-data boundaries](secret-handling.md): Keep credentials and private message data outside logs, tests and knowledge documents. (implemented).
- [Native Node releases and scheduling](native-releases.md): Deploy reviewed compiled releases with explicit migrations and bounded launchd cycles. (planned).
- [Classification quality and rollout evidence](classification-evaluation.md): Select model and thresholds from representative evidence before automatic task capture. (planned).
- [OKF selection and maintenance policy](okf-maintenance.md): Use index-first discovery and review provenance without inventing trust or auto-refreshing dates. (implemented).

[Bundle index](/index.md)
