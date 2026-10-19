# Spec Delta

## Purpose

Prevent bursty mailbox collection and stop an invocation when Gmail recognizes rate limiting, while preserving honest coverage and durable pending work.

## ADDED Requirements

### Requirement: Pace Gmail request starts
A reader invocation SHALL separate Gmail request starts by at least 1.5 seconds, including profile, list/history, full conversation and separately stored text reads. The first request MAY start immediately. Pacing SHALL share existing cancellation and deadline bounds and SHALL NOT alter unrelated provider behavior.

#### Scenario: Concurrent conversation reads
- **WHEN** multiple reads or body-part requests are ready together
- **THEN** their Gmail request starts respect the same minimum gap

#### Scenario: Cancellation during pacing
- **WHEN** cancellation or the invocation deadline occurs while waiting
- **THEN** waiting stops and no delayed Gmail request starts

### Requirement: Recognize throttling without leaking responses
HTTP 429 and HTTP 403 with structured `rateLimitExceeded` or `userRateLimitExceeded` reasons SHALL become the fixed failure `rate-limited`. Other HTTP 403 responses SHALL remain ordinary provider failures. Raw messages and response details SHALL NOT enter reports or storage.

#### Scenario: A permission failure is not throttling
- **WHEN** Gmail returns HTTP 403 for insufficient permissions or an unrecognized reason
- **THEN** the error remains `provider-error`

#### Scenario: Separately stored text is throttled
- **WHEN** fetching a selected body part returns recognized throttling
- **THEN** the conversation read fails as `rate-limited` rather than reporting unsupported or unavailable body coverage

### Requirement: Stop new requests after throttling
After recognized throttling, the reader SHALL reject subsequent and waiting reads without starting new Gmail requests. Preview, ingestion and synchronization SHALL stop selecting additional work on this failure, including after a discovery-page failure. Already started reads MAY finish; their complete evidence SHALL remain usable.

#### Scenario: Throttling on a later discovery page
- **WHEN** discovery has selected conversations and the next page is throttled
- **THEN** retrieval does not start and the report retains the rate-limit reason and incomplete coverage

#### Scenario: Mid-batch durable retrieval is throttled
- **WHEN** earlier conversations were committed and a later read is throttled
- **THEN** earlier commits remain, the failed retrieval receives normal durable backoff, unattempted retrievals remain untouched, and evidence freshness does not advance

### Requirement: Preserve resumability and diagnostics
Rate-limited collection SHALL report an unsuccessful/incomplete invocation with the fixed reason. DB-only status SHALL recognize the stored category. No new migration, scheduler or downstream provider write SHALL be required. Invocation-local pacing SHALL NOT be represented as coordination across separate processes or clients.

#### Scenario: A later due retry succeeds
- **WHEN** a later invocation reaches the failed retrieval after its saved retry date and Gmail permits reads
- **THEN** collection resumes normally and acknowledges only successfully processed work
