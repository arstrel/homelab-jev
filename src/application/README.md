# Knowledge pointers

[Processing cycle](../../knowledge/architecture/processing-cycle.md), [layer boundaries](../../knowledge/architecture/layers.md), and [planner handoff](../../knowledge/architecture/planner-handoff.md). Current status reads ledger counts; [manual Gmail preview](mail-preview.md) orchestrates read-only evidence retrieval. Durable cycle orchestration remains planned.

Manual [ingestion](ingest-mail.md) reuses retrieval and persists complete evidence through the evidence-store port. It never advances a checkpoint or invokes a classifier. These concepts guide discovery; current source, specifications and tests remain authoritative.
