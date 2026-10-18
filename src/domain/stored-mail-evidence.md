# Durable mail evidence

`snapshotSubmission` validates and copies complete evidence/observations and computes the existing v1 fingerprint. Required source/message identities, ISO timestamps, nonempty messages, body status/text and observation membership must agree. Partial bodies and extra provider fields are rejected with a fixed `invalid-data` error. Stored evidence lookup revalidates source identity and fingerprint before returning typed content.

The storage port accepts internal types, never SDK or Drizzle rows. Jobs bind to a specific mailbox/thread/fingerprint. Current labels and observation time remain separate from immutable substantive evidence. See the [ingestion design](../../openspec/changes/add-durable-mail-evidence/design.md).
