# Gmail reader

`gmailReader` implements the SDK-free application port. It lists thread identities with a fixed query and reads full conversations. Google response validation, MIME traversal, charset/base64url decoding and typed conversion stay in this adapter. `checkGmail` retains its separate bounded authentication check.

Every Gmail read uses the shared request/concurrency/deadline budget. OAuth refresh uses the same deadline/response limits, with zero retries explicitly enforced even when the auth helper supplies a retry configuration. SDK reads receive an explicitly acquired bearer token so middleware cannot replay failed 401/403 responses. Authentication errors are fixed categories, never raw exceptions.

Thread IDs, message IDs and timestamps are mandatory. Draft text is discarded. Available older non-draft context is preserved; the application decides whether a recent non-draft message makes the conversation eligible. Primary text parts can require a separate attachment-body read; document attachments never receive that read. Body/attachment coverage and observations stay explicit. No history cursor or persistent evidence is written.

See the [preview runbook](../../docs/gmail-preview.md), [application contract](../application/mail-preview.md), and [synthetic transport fixtures](../../tests/adapters/gmail.test.ts).
