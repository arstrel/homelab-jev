# Domain boundary

Pure classification, obligation, routing and snapshot policy belongs here. [Mail evidence types and deterministic fingerprints](mail-evidence.md) are implemented; the remaining obligation policies arrive in Sections 2–6. Domain modules must not import SDKs, PostgreSQL, environment configuration or wall-clock functions.

## OKF context

[Durable evidence validation](stored-mail-evidence.md) validates and snapshots exact complete inputs before persistence; malformed/partial payloads cannot become complete job inputs.

[Incremental sync types](mail-sync.md) distinguish discovery state, retryable retrieval work and successful evidence freshness without importing provider/storage models.

[Classification policy](../../knowledge/architecture/classification-policy.md), [manual edits](../../knowledge/architecture/manual-edits.md), [uncertainty](../../knowledge/architecture/uncertainty.md) and [Retro](../../knowledge/architecture/retro-feedback.md).
