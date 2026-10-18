# Spec Delta

## Purpose

Provide bounded, source-linked Gmail conversation evidence for later obligation processing, with deterministic content identity and a truthful read-only preview.

## ADDED Requirements

### Requirement: Fixed recent-mail discovery
The system SHALL discover Gmail conversations using a configurable recent window fixed at run start. Discovery SHALL include read, archived, incoming, and sent mail independently of Inbox or unread state, and exclude Spam and Trash by default.

#### Scenario: Read archived mail
- **WHEN** a read message outside Inbox falls within the configured window
- **THEN** its conversation is eligible for retrieval

#### Scenario: Recent sent reply
- **WHEN** an older conversation contains a sent message within the window
- **THEN** the conversation is eligible even without recent incoming mail

#### Scenario: Window remains fixed
- **WHEN** discovery requires several pages while time passes
- **THEN** all pages use the same search boundaries

### Requirement: Explicit discovery completeness
The system SHALL follow discovery pagination and deduplicate thread identifiers. It SHALL report discovery complete only after exhausting the available pages without dropping eligible identifiers; limits, deadlines, pagination failures, and repeated non-progressing page tokens SHALL produce an incomplete result.

#### Scenario: Duplicate identifiers across pages
- **WHEN** two pages contain the same thread identifier
- **THEN** that conversation is retrieved once in the run

#### Scenario: Thread limit reached
- **WHEN** further eligible identifiers remain beyond the configured thread limit
- **THEN** discovery is reported incomplete with a fixed limit reason

#### Scenario: Later discovery page fails
- **WHEN** a later page cannot be retrieved
- **THEN** already collected evidence remains distinguishable from a complete discovery result

#### Scenario: Provider result estimate differs
- **WHEN** an estimated result count disagrees with retrieved pages
- **THEN** completeness depends on exhausted pagination rather than that estimate

### Requirement: Full conversation context without drafts
The system SHALL retain available non-draft messages in selected conversations, including older context outside the discovery window. A conversation SHALL be eligible only if it contains a non-draft message within the window; draft text SHALL not appear in evidence.

#### Scenario: Older request resurfaces
- **WHEN** a recent reply selects a conversation with an older request
- **THEN** both messages are retained with their distinct source identifiers

#### Scenario: Unsent follow-up
- **WHEN** the conversation also contains a draft
- **THEN** the draft is excluded and the report counts its exclusion

#### Scenario: Only draft activity is recent
- **WHEN** a conversation has recent drafts but no non-draft message within the window
- **THEN** it produces no eligible evidence record

### Requirement: Versioned source evidence
The system SHALL produce a versioned evidence record containing mailbox/thread identity and individually identified messages with timestamps, relevant sender/recipient/subject headers, normalized body status/text, and attachment metadata. Observation time, labels, provider history identifiers, and direction hints SHALL remain separate from substantive evidence.

#### Scenario: Message provenance is retained
- **WHEN** two messages from different authors are normalized
- **THEN** their bodies remain associated with their respective message identifiers, timestamps, and headers

#### Scenario: Authorship hint is uncertain
- **WHEN** available mailbox identity and provider metadata do not establish a direction hint
- **THEN** the observation records an unknown direction rather than inventing an author relationship

#### Scenario: Required provider identity is malformed
- **WHEN** a message lacks a valid source identifier or timestamp
- **THEN** its conversation is reported incomplete rather than filling the missing value from the run clock

### Requirement: Deterministic primary body normalization
The system SHALL decode supported body encodings and MIME structures, preferring plain text to the equivalent HTML alternative. HTML conversion SHALL preserve meaningful text and links without executing content or loading remote resources. Separately stored primary text parts SHALL be read within the same budgets.

#### Scenario: Alternative text and HTML
- **WHEN** a message contains equivalent plain-text and HTML alternatives
- **THEN** evidence contains one primary body without duplicated alternatives

#### Scenario: HTML-only body
- **WHEN** the supported message body is HTML
- **THEN** normalized text preserves meaningful paragraphs and links without remote asset requests

#### Scenario: Separately stored text part
- **WHEN** primary message text requires a separate body-part read
- **THEN** that read supplies the normalized text rather than being ignored as a document attachment

### Requirement: Visible body and attachment coverage
The system SHALL distinguish complete, genuinely empty, unavailable, unsupported, and oversized message bodies. Document attachments SHALL contribute metadata only, with content coverage explicitly not read. Incomplete bodies SHALL prevent a complete-evidence fingerprint; silent truncation SHALL not produce a complete record.

#### Scenario: Body read fails
- **WHEN** required text cannot be retrieved
- **THEN** the conversation is reported partial with unavailable body coverage, not a successful empty body

#### Scenario: Legitimately empty message
- **WHEN** a valid supported body contains no text
- **THEN** its body status is empty rather than unavailable

#### Scenario: Body exceeds its budget
- **WHEN** a body is too large to process within the configured bounds
- **THEN** its status is oversized and no complete-evidence fingerprint is produced

#### Scenario: PDF attachment
- **WHEN** a message includes a PDF
- **THEN** evidence retains its metadata and reports attachment contents not read without downloading or interpreting the PDF

### Requirement: Stable substantive fingerprints
The system SHALL assign complete normalized evidence a deterministic, versioned fingerprint. Message ordering artifacts, labels, read state, observation times, and provider history identifiers SHALL not affect it. Changes to message identities, relevant headers, bodies, or attachment metadata SHALL affect it; decision policy version SHALL remain a separate identity dimension.

#### Scenario: Read-state-only change
- **WHEN** a conversation is retrieved again after only a read-state or label change
- **THEN** its complete-evidence fingerprint is unchanged

#### Scenario: New reply
- **WHEN** an incoming or sent message is added to the conversation
- **THEN** its complete-evidence fingerprint changes

#### Scenario: Equivalent provider ordering
- **WHEN** equivalent messages or object fields arrive in a different provider order
- **THEN** canonical normalized evidence has the same fingerprint

#### Scenario: Classification policy changes
- **WHEN** only a downstream decision policy version changes
- **THEN** the evidence fingerprint remains unchanged

### Requirement: Bounded cancellable reads
The system SHALL enforce validated thread, request, time, body-size, and parsing limits with bounded concurrency. On deadline or cancellation it SHALL stop starting reads and cancel outstanding requests. Request retries SHALL remain within those budgets; missing threads and provider failures SHALL remain visible in the result.

#### Scenario: Deadline during retrieval
- **WHEN** the deadline expires while requests are outstanding
- **THEN** the requests are cancelled, no further reads start, and the report is incomplete

#### Scenario: Conversation disappears
- **WHEN** a discovered conversation is unavailable at retrieval time
- **THEN** it is counted as a failed retrieval rather than an empty conversation

#### Scenario: Malformed recursive payload
- **WHEN** MIME nesting exceeds the parsing limit
- **THEN** processing ends within the bound and reports unsupported or incomplete evidence

### Requirement: Independent read-only preview
The system SHALL expose a manual mail preview using Google credentials and validated options only. It SHALL produce evidence in memory and sanitized counts/reasons in terminal output, with separate discovery and body-coverage completeness. It SHALL perform no database or Gmail writes, checkpoint advancement, Jev calls, Todoist/Drive operations, or synchronization-freshness claims.

#### Scenario: Google-only configuration
- **WHEN** valid Google credentials are present without database, Jev, or Todoist credentials
- **THEN** preview can retrieve mail without initializing those other services

#### Scenario: Successful bounded preview
- **WHEN** discovery is exhausted and every eligible conversation is fully retrieved
- **THEN** preview reports complete coverage and zero downstream writes

#### Scenario: Preview output privacy
- **WHEN** preview succeeds or encounters a provider failure
- **THEN** output contains fixed categories and counts without credentials, message bodies, subjects, addresses, source identifiers, or raw provider errors

#### Scenario: Invalid options
- **WHEN** an option is unknown, duplicated, malformed, or outside its allowed range
- **THEN** preview fails before any provider request

#### Scenario: Partial successful sample
- **WHEN** a configured sampling limit prevents complete discovery without another operational failure
- **THEN** preview reports the limit explicitly and uses a distinct incomplete exit status
