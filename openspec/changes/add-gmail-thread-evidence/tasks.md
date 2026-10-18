# Tasks

Implement only [this evidence contract](specs/mail-evidence/spec.md). Each group lands its tests and documentation with the behavior it introduces. The broader [preprocessing plan](../add-personal-brief-preprocessing/tasks.md) retains durable synchronization, classification, downstream writes, and scheduling.

## 1. Evidence contract and fingerprints

- [x] 1.1 Add internal evidence, body-coverage, observation, and outcome types plus synthetic fixed-time thread fixtures; verify tests preserve individual provenance and reject missing identities/timestamps without invented values.
- [x] 1.2 Implement the versioned canonical material projection and SHA-256 fingerprint; verify repeat/order/read/label/policy changes preserve identity, new incoming/sent evidence changes it, and partial bodies cannot receive a complete fingerprint.
- [x] 1.3 Document the public internal contract and canonicalization/version rules beside the domain module; verify documented synthetic examples match the fixture outputs and include unread attachment-content coverage.

## 2. Gmail discovery and bounded retrieval

- [x] 2.1 Add the mail-reader port and Gmail discovery/full-thread adapter using the existing SDK; verify MSW tests exercise fixed epoch search boundaries, archived/read/sent mail, `format: full`, default Spam/Trash exclusion, and no mutation endpoints.
- [x] 2.2 Implement paginated discovery and identifier deduplication with selection caps and stalled-token detection; verify application/transport fixtures cover duplicate IDs, exact final-page exhaustion, cap with a next page, misleading result estimates, and a later-page failure retaining partial results.
- [x] 2.3 Add shared read budgets, bounded concurrency, request timeouts, cancellation, and response/message/parsing limits; verify fixture tests bound requests and memory-facing payloads, cancel outstanding reads, stop new reads after deadline, and expose missing threads or malformed responses.
- [x] 2.4 Document reader-port semantics and discovery-versus-retrieval completeness alongside the application/adapter modules; verify tests demonstrate that a selected old thread retains context and a recent-draft-only thread produces no eligible evidence.

## 3. MIME normalization and coverage

- [x] 3.1 Select small runtime HTML/address parsers if needed, pin dependencies/lockfile, and record the selection and supported decoding policy; verify relevant primary documentation, offline parser fixtures, and clean `npm ci` compatibility with the pinned runtime.
- [x] 3.2 Implement supported charset/base64url decoding, multipart primary-text selection, HTML-to-text conversion, and bounded separately stored text-part retrieval; verify fixtures cover plain/HTML alternatives, HTML-only bodies, meaningful links/paragraphs, multiple primary sections, quoted context, and no remote asset requests.
- [x] 3.3 Implement draft exclusion, attachment metadata, observation hints, and explicit empty/unavailable/unsupported/too-large body outcomes; verify fixtures exclude draft text, preserve older incoming/sent context, expose uncertain direction, avoid document downloads, and produce partial coverage without complete fingerprints on failures.
- [x] 3.4 Document supported MIME/charset behavior, byte limits, and unread attachment-content limitations in the retrieval runbook; verify every documented limitation has a synthetic example or bounded failure test.

## 4. Preview application and CLI

- [x] 4.1 Compose the preview use case with injected clock/mail/budget ports and no ledger or other provider dependencies; verify application tests distinguish exhausted discovery, partial bodies, failed retrievals, skipped draft-only threads, and intentionally limited samples with stable counts.
- [x] 4.2 Add command-specific option validation, the compiled `mail:preview` CLI path, and explicit-env npm script; verify valid Google-only configuration works without DB/Jev/Todoist configuration, invalid/duplicate/unknown options cause zero requests, existing commands retain their contracts, and exit statuses distinguish complete/sample/error outcomes.
- [x] 4.3 Add sanitized preview reporting and failure mapping; verify sensitive fixture markers, source IDs, addresses, subjects, bodies, credentials, and raw provider errors never appear in stdout/stderr, and no checkpoint, source, task, or publication write occurs.
- [x] 4.4 Complete the preview runbook with build/invocation examples, defaults, output/exit semantics, rerun procedure, and future evidence-version handoff; update relevant OKF claims/snapshots deliberately and verify local document links, OKF checks, and consistency with the parent task boundaries.

## 5. Integrated acceptance

- [x] 5.1 Run the full `npm run check` gate and inspect the synthetic scenario-to-test coverage; verify all evidence-spec scenarios are covered, compiled help remains offline, and the diff contains no database migration, history checkpoint handling, scheduled job, or downstream provider effects.
- [x] 5.2 Run one manual bounded preview after building, record only sanitized counts/coverage/limits in the runbook, and verify zero downstream writes and honest sample status; keep this credentialed read outside tests and CI, and document any unavailable live verification rather than substituting synthetic results for it.
- [x] 5.3 Reconcile parent progress against delivered evidence: mark 2.1 only when its acceptance passes, keep 2.3 pending until expired-cursor recovery also exists, and retain 2.2/2.4; verify OpenSpec strict validation and preserve fully staged pre-commit plus PostgreSQL pre-push/CI gates for any subsequent commit/push.
