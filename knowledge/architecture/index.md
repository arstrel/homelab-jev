# Architecture

- [Application boundaries and composition](layers.md): Keep pure decisions separate from provider and database side effects. (mixed).
- [Five-minute processing cycle](processing-cycle.md): Collection launcher tooling is implemented; full classification/reconciliation/publication remains planned. (mixed).
- [Gmail evidence and checkpoint safety](gmail-checkpoints.md): Record evidence and jobs before advancing the mailbox cursor. (mixed).
- [Bounded Gmail conversation evidence](gmail-evidence.md): Retrieve normalized text and stable fingerprints with explicit partial coverage and no downstream writes. (implemented).
- [PostgreSQL processing ledger](ledger.md): Describe the current ledger schema and atomic ingestion without claiming remote exactly-once behavior. (implemented).
- [Durable mail evidence ingestion](mail-ingestion.md): Preserve exact complete evidence and replay-safe jobs through explicit manual ingestion. (implemented).
- [Manual incremental Gmail synchronization](mail-sync.md): Resume discovery and durable retrieval retries with separate evidence freshness. (implemented).
- [Bounded expired-cursor recovery](mail-recovery.md): Resume recent and mapped scans while preserving pending work and disclosing history gaps. (implemented).
- [Replay-safe remote writes](remote-write-safety.md): Persist stable intent identity before Todoist writes and reconcile ambiguous outcomes. (mixed).
- [Preserve manual task changes](manual-edits.md): User task edits and completion override worker inference. (planned).
- [Typed classification and evidence policy](classification-policy.md): Preview bounded typed judgments; evaluated matching, routing and capture remain planned. (mixed).
- [Uncertainty remains visible](uncertainty.md): Prefer explicit review states to invented precision or silent loss. (planned).
- [Retro interpretation and reusable inventory](retro-feedback.md): Use daily feedback without consuming broad goals or recurring activity options. (mixed).
- [Drive snapshot and planner freshness](planner-handoff.md): Cached-only publication and the isolated timer-triggered handoff are verified, including canonical JSON repair/readback. (mixed).

[Bundle index](/index.md)
