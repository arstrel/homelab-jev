# Design

## Context

See [proposal.md](proposal.md) for motivation and [the evidence contract](specs/mail-evidence/spec.md) for observable requirements. Current sources were inspected after the OKF merge on `main` (`f0f5e86`).

- `src/adapters/gmail.ts` only performs a bounded profile read. There is no discovery, body retrieval, or Gmail synchronization use case.
- `src/application/ports.ts` exposes runtime and ledger-status ports. Provider SDK response types must stay in adapters.
- `src/cli.ts` composes existing commands and rejects extra arguments. Preview needs command-specific option parsing without relaxing other commands.
- `googleAuth()` already loads the three independent Google credentials. `workerConfiguration()` requires database and Jev configuration, so preview must not use it.
- The PostgreSQL source/job tables store identity and fingerprint but no corresponding evidence payload. No schema or repository changes belong in this slice.
- Vitest/MSW, fixed runtime fixtures, compiled CLI smoke checks, and the canonical offline gate already exist.

Relevant advisory context: [application layers](../../../knowledge/architecture/layers.md), [checkpoint safety](../../../knowledge/architecture/gmail-checkpoints.md), [ledger](../../../knowledge/architecture/ledger.md), and [private data](../../../knowledge/operations/secret-handling.md). Those concepts remain draft; current code and specifications are authoritative.

## Goals / Non-Goals

**Goals:**
- Give subsequent ingestion a typed, deterministic evidence boundary, independently testable against Gmail fixtures.
- Separate substantive evidence, mutable observation metadata, and discovery/body coverage.
- Make the manual preview bounded and useful with Google credentials alone.

**Non-Goals:**
- Establishing a point-in-time mailbox snapshot, a durable bootstrap cursor, or successful worker-sync freshness.
- Equating a Gmail thread with one obligation, or interpreting replies as task completion/waiting.
- Treating complete message text as proof that unread document attachments contain no obligations.

## Decisions

### 1. Isolate retrieval from durable ingestion

Use the following stage boundary:

```text
Gmail → discover IDs → retrieve conversation → normalize evidence → fingerprint
                                                                    │
                                                   in-memory evidence + preview
                                                                    │
                                                      subsequent change boundary
                                                                    ▼
                           PostgreSQL evidence versions + pending jobs + checkpoint
                                                                    ▼
                                        Jev → Todoist → Drive → scheduled briefs
```

The preview composition has no ledger, Jev, Todoist, or Drive dependencies. An adapter test must fail if it tries an unexpected endpoint. Avoid building a temporary database staging path: it would require queue identity, retention, and checkpoint semantics before retrieval is validated.

This change supplies parent task 2.1 and pure fingerprinting from 2.3. It does not complete 2.2, expired-cursor recovery in 2.3, or the scheduled/no-change observation requirements in 2.4. Parent checkboxes stay unchecked until their whole acceptance criteria are satisfied.

### 2. Fix the discovery window, paginate, and fetch conversation context

Inject the run clock. Compute `since` and `until` once, convert to epoch-second search boundaries, and keep the query unchanged across pages. A proposed default is 30 days. Do not filter to unread, Inbox, or `from:<primary address>`: sent mail and aliases must remain discoverable.

Use `users.threads.list` with `includeSpamTrash: false`, follow `nextPageToken`, and deduplicate thread IDs. Do not trust `resultSizeEstimate` as a count or completeness guarantee. Fetch selected threads using `users.threads.get` with `format: full`. Retain non-draft context outside the discovery window; require at least one non-draft message within the window so recent draft-only activity does not make old mail eligible.

A conversation can change between listing and retrieval. This is an observation of available evidence, not an atomic snapshot: retain the non-draft messages actually returned, including new replies that arrived during retrieval, and record observation time separately. Never derive or save an ingestion checkpoint from this preview.

Alternative considered: message-only discovery/retrieval. Thread discovery directly matches the conversation unit and avoids losing older context; individual message identity is still retained in every record.

### 3. Keep evidence and observations separate

Proposed internal contract, with SDK objects validated and converted at the adapter boundary:

```ts
type Body =
  | { status: "complete" | "empty"; text: string }
  | { status: "unavailable" | "unsupported" | "too-large" };

type ThreadEvidence = {
  schemaVersion: "mail-evidence/v1";
  source: { provider: "gmail"; mailbox: string; threadId: string };
  messages: Array<{
    id: string;
    receivedAt: string; // validated internalDate, expressed as UTC
    from: Address[];
    to: Address[];
    cc: Address[];
    subject: string;
    messageIdHeader?: string;
    inReplyTo?: string;
    references: string[];
    body: Body;
    attachments: AttachmentMetadata[];
  }>;
  coverage: { messageBodies: "complete" | "partial"; attachmentContents: "not-read" };
};

type ThreadObservation = {
  observedAt: string;
  providerHistoryId?: string;
  messages: Array<{
    id: string;
    labels: string[];
    direction: "incoming" | "sent" | "unknown";
  }>;
};
```

Mailbox is an internal stable account identifier, initially `primary`, not a logged address. Parse sender/recipient headers with an RFC-aware parser rather than splitting commas. Retain meaningful display names, normalize domains conservatively, and do not rewrite local parts. Preserve reference headers for later matching. Missing IDs or invalid timestamps make the thread incomplete; do not invent timestamps using the run clock.

Direction is an observation hint using available system metadata and the authenticated mailbox identity. Do not infer aliases from display names or claim sender authentication. Unknown relationships remain unknown. Automated send-as settings discovery requiring additional permission is outside this slice.

A thread may contain several future obligations, and one obligation may span several threads. Source identity does not become obligation identity.

### 4. Normalize MIME text conservatively

The Gmail adapter owns MIME traversal, base64url/charset decoding, and separately stored body-part reads. Prefer `text/plain` within `multipart/alternative`; otherwise convert supported HTML to text. Preserve distinct primary inline text sections in semantic order without also duplicating their alternative representation. Body selection must distinguish document/inline-resource attachments from actual text bodies.

Preserve paragraphs, meaningful links, signatures, and quoted context initially. Do not strip arbitrary quoted lines or attempt to extract actions in the normalizer. Never render HTML, execute scripts, fetch links, or load remote assets. Unsupported charsets, malformed payloads, missing text parts, and exceeded limits produce explicit partial coverage.

Document attachments contribute stable part ID, filename, MIME type, and size metadata. A primary text part with an `attachmentId` is fetched through the body endpoint within the same request/time budgets; a PDF or image is not fetched.

Use existing Node decoding and the Google SDK. If HTML/address parsing needs a package, implementation must select and pin small maintained runtime parsers, inspect their relevant primary documentation, and prove the contract with fixtures. The exact parser is replaceable without changing the spec; development-only OKF viewer libraries are not application runtime dependencies.

Alternative considered: use Gmail snippets or regex-based HTML stripping. Snippets omit evidence, and regex cannot reliably handle MIME alternatives, HTML entities, or address syntax.

### 5. Fingerprint complete evidence through a versioned projection

Sort messages by validated timestamp then message ID. Canonicalize object keys and semantically unordered attachment/recipient metadata consistently, preserving meaningful body order. Hash a documented material projection containing schema/normalization version, mailbox/thread identity, message IDs, timestamps, relevant headers, complete body text/status, and attachment metadata.

Exclude labels, direction hints, provider history IDs, observation times, and downstream decision policy. Return a version-qualified SHA-256 identity such as `mail-evidence/v1:sha256:<digest>`. A normalizer change that alters material semantics requires a version change and reviewed fixture updates.

Partial evidence has no complete fingerprint. Never hash only a silently truncated prefix as if it were the complete message. Genuinely empty bodies remain valid material evidence; attachment-content coverage remains explicitly not read.

### 6. Bound manual operation and make exit behavior explicit

Proposed first-release defaults and guards (operational tuning, not claims about user-approved final pilot settings):

| Option or budget | Initial value / validation |
| --- | --- |
| `--days` | 30; integer 1–365 |
| `--max-threads` | 20; integer 1–500 |
| Concurrent reads | 3; bounded shared pool, including body-part reads |
| Run deadline | 120 seconds, including authentication and all reads |
| Per-request timeout | At most 10 seconds and remaining run time |
| Gmail read attempts | At most 200 per run; one attempt per operation, automatic read retries disabled |
| Message limit | 200 per conversation |
| MIME nesting | At most 20 levels |
| Body bytes | At most 1 MiB per selected text body; 10 MiB aggregate normalized evidence per run |
| Transport payload | Bound response size before unbounded decoding; initial target 4 MiB per response |

Use one shared cancellation/deadline context for discovery, retrieval, and text-part reads. Enforce byte limits conservatively before decoding when provider sizes are available and again against actual bytes; stop accumulating evidence at aggregate limits. Bound provider response handling at transport level. Stop starting requests and abort outstanding requests when cancelled. Repeated page tokens terminate discovery as incomplete. Coordinated transient retries belong to later operation work; a failed read is visible and rerunnable now.

Preview command after implementation:

```sh
npm run build
npm run mail:preview -- --days 30 --max-threads 20
# Equivalent compiled invocation:
node --env-file=.env dist/cli.js mail:preview --days 30 --max-threads 20
```

The proposed npm script invokes the compiled command with explicit `.env` loading. It does not implicitly build. Parse options and validate Google configuration before requests; reject unknown, duplicate, malformed, or out-of-range options without echoing their values. Preserve existing command/help behavior. No database or other provider is initialized.

Terminal output contains window bounds, counts, fixed reason codes, discovery completeness, body coverage, and zero downstream writes. Do not emit bodies, subjects, addresses, raw IDs, tokens, or raw exceptions. No evidence-export option or persistent report file is introduced.

Exit statuses: `0` for complete discovery with complete eligible evidence (including an empty mailbox result); `2` for a deliberately limited sample without another failure; `1` for invalid configuration/options, provider failures, malformed/partial evidence, or exceeded operational budgets. Standard signal exits remain nonzero and cancel requests. Error status takes precedence over sample status.

### 7. Example inputs and artifacts

All examples and test fixtures use synthetic mail:

| Thread / message | Time | State | Body |
| --- | --- | --- | --- |
| `t-boiler` / `m1` | 2026-08-20 16:00 UTC | Incoming, read, archived | Please send two dates for the boiler inspection. |
| `t-boiler` / `m2` | 2026-10-10 18:00 UTC | Sent | October 16 or 19 would work. Please confirm. |
| `t-boiler` / `m3` | 2026-10-11 00:00 UTC | Draft | Unsent follow-up. |

For a run ending October 11 at 12:00 UTC with a 30-day window, `m2` selects the conversation; `m1` is retained and `m3` excluded. Condensed internal output:

```json
{
  "schemaVersion": "mail-evidence/v1",
  "source": { "provider": "gmail", "mailbox": "primary", "threadId": "t-boiler" },
  "coverage": { "messageBodies": "complete", "attachmentContents": "not-read" },
  "messages": [
    {
      "id": "m1",
      "receivedAt": "2026-08-20T16:00:00.000Z",
      "from": [{ "address": "service@example.com" }],
      "to": [{ "address": "me@example.com" }],
      "cc": [],
      "subject": "Boiler inspection",
      "references": [],
      "body": { "status": "complete", "text": "Please send two dates for the boiler inspection." },
      "attachments": []
    },
    {
      "id": "m2",
      "receivedAt": "2026-10-10T18:00:00.000Z",
      "from": [{ "address": "me@example.com" }],
      "to": [{ "address": "service@example.com" }],
      "cc": [],
      "subject": "Re: Boiler inspection",
      "references": [],
      "body": { "status": "complete", "text": "October 16 or 19 would work. Please confirm." },
      "attachments": []
    }
  ]
}
```

Fingerprint and observations are returned alongside the evidence. An illustrative fingerprint is `mail-evidence/v1:sha256:<digest>`; the placeholder is not a claimed calculation. The terminal artifact is only a sanitized report:

```text
Window: 2026-09-11T12:00:00Z … 2026-10-11T12:00:00Z
Discovery complete: yes
Eligible threads: 1
Messages normalized: 2
Drafts excluded: 1
Partial threads: 0
Failed threads: 0
Downstream writes: 0
```

Marking `m1` unread changes observations only. Adding a contractor reply changes the fingerprint. A failed body read makes the evidence partial and removes its complete fingerprint. A PDF contributes attachment metadata and the unchanged `not-read` content coverage. Interpreting this conversation as waiting for confirmation remains a later Jev decision; the two proposed dates are not assigned task deadlines here.

### 8. Core pseudocode and module boundaries

Proposed modules: `src/application/preview-mail.ts` for orchestration, an added reader port in `src/application/ports.ts`, `src/adapters/gmail.ts` and a body helper for Google/MIME conversion, `src/domain/mail-evidence.ts` for internal types and pure fingerprints, and existing config/CLI files for command composition.

```ts
async function previewMail(options, { mail, clock, budget }) {
  const until = clock.now();
  const window = { since: subtractDays(until, options.days), until };
  const discovery = await discoverUniqueThreads(mail, window, options, budget);
  const outcomes = await boundedMap(discovery.ids, budget, async (id) => {
    try {
      // Port returns validated internal values, never a Google SDK object.
      const result = await mail.readThreadEvidence(id, budget);
      if (!hasNonDraftMessageInWindow(result.evidence, window)) return skipped();
      return {
        ...result,
        fingerprint: bodiesComplete(result.evidence)
          ? fingerprint(result.evidence)
          : undefined,
      };
    } catch (error) {
      return failed(fixedFailureCategory(error));
    }
  });
  return { evidence: collectEvidence(outcomes), report: summarize(discovery, outcomes) };
}

async function discoverUniqueThreads(mail, window, options, budget) {
  const ids = new Set();
  const tokens = new Set();
  let token;
  do {
    budget.assertCanRead();
    const page = await mail.listThreads(fixedQuery(window), token, budget);
    for (const id of page.ids) {
      if (ids.has(id)) continue;
      if (ids.size === options.maxThreads) return incomplete(ids, "thread-limit");
      ids.add(id);
    }
    token = page.nextToken;
    if (token && tokens.has(token)) return incomplete(ids, "pagination-stalled");
    if (token) tokens.add(token);
    if (token && ids.size === options.maxThreads) return incomplete(ids, "thread-limit");
  } while (token);
  return complete(ids);
  // Page failure/deadline handler retains collected IDs and an incomplete reason.
}
```

The application must also bound discovery work: at the configured selection cap, stop before requesting another page and report incomplete if a next token exists. Fetch concurrency and selection do not depend on response arrival order. A retrieval/body failure overrides overall success without misrepresenting exhausted discovery.

```ts
// Gmail adapter; full MIME traversal stays out of the application port.
async function normalizeBody(message, budget) {
  const selected = selectPrimaryTextParts(message.payload, budget.maxDepth);
  if (!selected.supported) return { status: "unsupported" };
  const texts = [];
  for (const part of selected.parts) {
    const bytes = part.attachmentId
      ? await getTextBodyPart(message.id, part.attachmentId, budget)
      : decodeBase64UrlWithinBudget(part.data, budget);
    budget.reserveBodyBytes(bytes.length);
    const decoded = decodeCharset(bytes, part.charset);
    texts.push(part.mimeType === "text/html" ? htmlToText(decoded) : decoded);
  }
  const text = normalizeLineEndings(joinPrimarySections(texts));
  return { status: text.length ? "complete" : "empty", text };
  // Failure mapping distinguishes unavailable, unsupported and too-large bodies.
}

// Domain; no network, wall clock, random IDs or decision policy.
function fingerprint(evidence) {
  assertCompleteBodies(evidence);
  const material = canonicalMaterialProjection(evidence);
  return `mail-evidence/v1:sha256:${sha256(canonicalJson(material))}`;
}
```

### 9. Subsequent durable population

This slice populates in-memory evidence, observations, and terminal counts; the repository gains synthetic fixtures and documentation. PostgreSQL, Todoist, and Drive remain untouched.

Before durable queueing, add immutable evidence versions keyed by mailbox/thread/fingerprint and make pending jobs reference the version actually classified. Keep the latest observed source pointer separate from those versions. The ingestion transaction must persist versions and deduplicated jobs before advancing a safe incremental checkpoint. Retention must not discard evidence needed by unfinished jobs. These are requirements to address in the next ingestion proposal, not a migration or transaction delivered here.

### 10. Verification and knowledge maintenance

Use fixed clocks and synthetic multipart payloads in unit/application tests, and the installed SDK against MSW in adapter tests. Assert fixed pagination windows, request paths/query options, cancellation, missing threads, malformed provider data, byte limits, and no unexpected endpoints. Tests never load operational `.env`. Cover unchanged fingerprints for read/label changes and provider ordering, changed fingerprints for new sent/incoming messages, MIME alternatives, HTML-only messages, external text parts, drafts, and attachment-only mail.

CLI checks must prove Google-only configuration is sufficient, invalid options cause no requests, reports omit sensitive fixture markers even on failures, exit codes reflect coverage, and compiled help remains offline. Run `npm run check`; retain the existing PostgreSQL pre-push/CI gate even though no migration is added. A live preview is manually invoked during implementation, outside tests/CI; record counts/limits only, never real message contents.

Update the relevant OKF concepts after the implementation changes their factual claims. Review snapshot digests and meaningful-change timestamps deliberately, preserving draft/unverified status and review deadlines. The current planning-only change does not claim retrieval is implemented.

## Risks / Trade-offs

- [Conversation changes during retrieval] → Treat results as observations; cursor anchoring and history catch-up belong to durable ingestion.
- [A 20-thread preview is mistaken for a complete mailbox scan] → Report discovery separately and exit with the explicit sample status.
- [MIME/charset diversity loses meaning] → Conservative parsing, synthetic edge fixtures, explicit partial coverage, and no complete fingerprint for partial bodies.
- [Attachments contain the action] → Retain metadata and explicit unread-content coverage; later classification must handle uncertainty.
- [Private content leaks through diagnostics] → Fixed output categories, no raw identifiers/content, and sensitive-marker tests.
- [Large conversations exhaust memory or time] → Shared request/deadline/byte budgets and bounded transport/parsing before unbounded decoding.
- [An observation becomes mismatched queued evidence] → Require immutable evidence-version references in the subsequent ledger change.

## Migration Plan

No database migration, scheduled job, OAuth scope expansion, or external write is introduced. After implementation, build with the pinned runtime and manually run the bounded preview. Rollback removes the new command/code and restores the prior compiled build; there is no durable worker state to undo. Do not install launchd or alter scheduled-task instructions as part of this change.

## Provider References

- [Thread listing and pagination](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/list)
- [Full thread retrieval](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.threads/get)
- [Message payload and internal dates](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages)
- [Separately stored message bodies](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments)
- [Search syntax and date boundaries](https://developers.google.com/workspace/gmail/api/guides/filtering)

## Implementation Notes

The implemented preview uses pinned `email-addresses` 5.0.0 and `html-to-text` 10.0.1 runtime parsers. It additionally bounds MIME traversal to 2,000 parts per conversation and detects HTML conversion limit markers. The JSON report includes fixed body-status counters, enabling diagnosis without content output. OAuth refresh retries are explicitly disabled, and SDK reads use bounded token acquisition with explicit bearer headers to prevent middleware replay on unauthorized responses. See [the runbook and acceptance coverage](../../../docs/gmail-preview.md) for supported behavior and sanitized live results. Durable synchronization remains a subsequent change.
