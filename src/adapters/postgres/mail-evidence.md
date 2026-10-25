# Evidence persistence

`mailEvidenceStore` implements the SDK-free evidence port. A validated batch is snapshotted, sorted, and committed in one transaction: latest source observation, immutable evidence versions, then exact-bound deduplicated jobs. Version/job counters come from inserted rows. Matching legacy jobs can acquire their exact recovered evidence without resetting state. An older observation cannot replace a newer source timestamp.

The evidence composite key is mailbox/thread/fingerprint. Nullable job bindings preserve pre-migration jobs; a composite FK and equality check prevent mismatched bindings. `evidenceForJob` returns `missing-job`, `missing-evidence`, or the validated exact payload. No lookup substitutes the current source fingerprint. A database trigger blocks evidence updates, and job references block deletion. No automatic retention cleanup exists.

This transaction never advances checkpoints or calls providers. The synchronizer uses this complete-evidence transaction to persist exact-bound jobs and acknowledge retrieval work atomically; discovery progress is committed separately with its durable retrieval queue. The foundation repository now exposes raw status only; its unused unbound-ingestion and generic mutation helpers were removed. See [operations](../../../docs/mail-ingestion.md).
