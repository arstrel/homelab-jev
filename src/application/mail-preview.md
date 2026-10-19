# Preview orchestration

The `MailReader` port accepts a fixed query/page token and returns validated internal thread evidence. SDK objects do not cross it. `previewMail` injects a clock, reader and shared read budget; there are no ledger or downstream provider ports.

Discovery follows pages, deduplicates IDs and stops visibly at caps, errors, deadlines or stalled tokens. Full final-page exhaustion differs from a capped sample with a remaining page token; provider result estimates are ignored. Collected evidence survives an ordinary later discovery failure when remaining budgets permit retrieval. Recognized `rate-limited` is terminal for selection: skip retrieval after discovery throttling and stop workers taking new IDs after a conversation throttle. Already-started successful reads remain in selection order; unattempted IDs are not counted as failed reads, and body coverage stays incomplete. Ingestion can persist the completed eligible subset.

The recent interval is aligned to whole seconds and uses `[since, until)` consistently for queries and eligibility. An August request resurfaced by an October sent reply retains both messages. Recent draft-only activity is skipped. Returned context may include replies arriving during retrieval: this does not establish an atomic snapshot or a sync checkpoint.

Results preserve selection order regardless of request completion order. Discovery completeness and text coverage are separate: exhausted discovery can still contain failed/partial retrievals. Body failures prevent complete fingerprints. The public report contains only fixed categories, time bounds and counts; the command never serializes internal records.

See the [evidence contract](../domain/mail-evidence.md), [runbook](../../docs/gmail-preview.md), and [application fixtures](../../tests/unit/mail-preview.test.ts).
