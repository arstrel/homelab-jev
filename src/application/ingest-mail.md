# Manual ingestion use case

`ingestMail` first runs bounded preview retrieval, then submits only complete eligible evidence to `EvidenceStore` in one batch. Runtime clock/IDs, reader, budget and storage are injected. The returned object is a sanitized report without internal records. `obligation-triage/v1` is queue policy identity, separate from the substantive evidence hash and any future measured model choice.

Coverage failures and caps retain preview semantics even if the complete subset commits. A storage failure reports zero committed counters, fixed `persistence-error` and exit 1. Cancellation before persistence opens no transaction. No checkpoints, model calls or remote effects are dependencies. See [operator runbook](../../docs/mail-ingestion.md) and [storage adapter](../adapters/postgres/mail-evidence.md).
