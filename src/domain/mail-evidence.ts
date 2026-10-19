import { createHash } from "node:crypto";

export interface Address {
  address: string;
  name?: string;
}
export interface AttachmentMetadata {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
}
export type MailBody =
  | { status: "complete" | "empty"; text: string }
  | { status: "unavailable" | "unsupported" | "too-large" };
export interface MailMessage {
  id: string;
  receivedAt: string;
  from: Address[];
  to: Address[];
  cc: Address[];
  subject: string;
  messageIdHeader?: string;
  inReplyTo?: string;
  references: string[];
  body: MailBody;
  attachments: AttachmentMetadata[];
}
export interface ThreadEvidence {
  schemaVersion: "mail-evidence/v1";
  source: { provider: "gmail"; mailbox: string; threadId: string };
  messages: MailMessage[];
  coverage: { messageBodies: "complete" | "partial"; attachmentContents: "not-read" };
}
export interface ThreadObservation {
  observedAt: string;
  providerHistoryId?: string;
  messages: Array<{ id: string; labels: string[]; direction: "incoming" | "sent" | "unknown" }>;
}
export interface ThreadRead {
  evidence: ThreadEvidence;
  observation: ThreadObservation;
  draftsExcluded: number;
}
export type MailFailure =
  | "provider-error"
  | "rate-limited"
  | "history-expired"
  | "missing-thread"
  | "invalid-data"
  | "deadline"
  | "cancelled"
  | "request-limit"
  | "too-large"
  | "pagination-stalled";
export class MailReadError extends Error {
  constructor(readonly reason: MailFailure) {
    super(reason);
    this.name = "MailReadError";
  }
}
export function mailFailure(error: unknown): MailFailure {
  return error instanceof MailReadError ? error.reason : "provider-error";
}
export function completeBodies(evidence: ThreadEvidence): boolean {
  return (
    evidence.coverage.messageBodies === "complete" &&
    evidence.messages.every(
      (message) => message.body.status === "complete" || message.body.status === "empty",
    )
  );
}
export function eligibleThread(
  read: ThreadRead,
  window?: { since: number; until: number },
): boolean {
  return (
    read.evidence.messages.length > 0 &&
    !read.observation.messages.some((message) =>
      message.labels.some((label) => label === "SPAM" || label === "TRASH"),
    ) &&
    (!window ||
      read.evidence.messages.some((message) => {
        const at = Date.parse(message.receivedAt);
        return at >= window.since && at < window.until;
      }))
  );
}
const ordered = <T>(values: readonly T[]): T[] =>
  [...values].sort((a, b) => {
    const left = JSON.stringify(a);
    const right = JSON.stringify(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
const addresses = (values: readonly Address[]) =>
  ordered(
    values.map((a) => ({
      address: a.address,
      ...(a.name === undefined ? {} : { name: a.name }),
    })),
  );

/** v1 uses an explicit ordered projection, not arbitrary provider object serialization. */
export function fingerprint(evidence: ThreadEvidence): string {
  if (!completeBodies(evidence)) throw new MailReadError("invalid-data");
  const messages = [...evidence.messages]
    .sort((a, b) => {
      const time = Date.parse(a.receivedAt) - Date.parse(b.receivedAt);
      return time || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    })
    .map((m) => ({
      id: m.id,
      receivedAt: m.receivedAt,
      from: addresses(m.from),
      to: addresses(m.to),
      cc: addresses(m.cc),
      subject: m.subject,
      messageIdHeader: m.messageIdHeader ?? null,
      inReplyTo: m.inReplyTo ?? null,
      references: m.references,
      body:
        m.body.status === "complete" || m.body.status === "empty"
          ? { status: m.body.status, text: m.body.text }
          : null,
      attachments: ordered(
        m.attachments.map((a) => ({
          partId: a.partId,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size,
        })),
      ),
    }));
  const material = {
    version: evidence.schemaVersion,
    provider: evidence.source.provider,
    mailbox: evidence.source.mailbox,
    threadId: evidence.source.threadId,
    messages,
  };
  return `mail-evidence/v1:sha256:${createHash("sha256").update(JSON.stringify(material)).digest("hex")}`;
}
