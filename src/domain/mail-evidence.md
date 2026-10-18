# Mail evidence v1

`mail-evidence.ts` contains provider-independent records. Each message retains its own identity, timestamp, relevant headers and body; drafts are excluded by the adapter. Observations contain labels, history identity, retrieval time and direction hints. Attachment content is explicitly `not-read`, even for complete text evidence.

Fingerprinting uses SHA-256 over an explicit fixed-key projection. Messages sort by timestamp then ID, addresses/attachment metadata by their explicit JSON projections; reference-header order and body text remain meaningful. Missing optional reference headers project to null. Labels, observations and downstream decision policy are excluded. Complete and genuinely empty bodies are valid; partial bodies are rejected. Material normalization changes require a version change.

The synthetic boiler conversation in `tests/fixtures/mail.ts` retains an August request and October sent reply as separate messages. Its normalized record matches the [design example](../../openspec/changes/add-gmail-thread-evidence/design.md). It makes no waiting/completion/date judgment.

See the [evidence spec](../../openspec/changes/add-gmail-thread-evidence/specs/mail-evidence/spec.md) and [retrieval runbook](../../docs/gmail-preview.md).
