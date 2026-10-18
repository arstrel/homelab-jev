import { z } from "zod";
import {
  fingerprint,
  MailReadError,
  type ThreadEvidence,
  type ThreadObservation,
} from "./mail-evidence.js";

const text = z.string().min(1);
const date = z.string().refine((value) => {
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
});
const address = z
  .object({ address: text, name: z.string().optional() })
  .strict()
  .transform(({ address, name }) => ({ address, ...(name === undefined ? {} : { name }) }));
const body = z.union([
  z.object({ status: z.literal("complete"), text }).strict(),
  z.object({ status: z.literal("empty"), text: z.literal("") }).strict(),
]);
const evidenceSchema = z
  .object({
    schemaVersion: z.literal("mail-evidence/v1"),
    source: z.object({ provider: z.literal("gmail"), mailbox: text, threadId: text }).strict(),
    messages: z
      .array(
        z
          .object({
            id: text,
            receivedAt: date,
            from: z.array(address),
            to: z.array(address),
            cc: z.array(address),
            subject: z.string(),
            messageIdHeader: text.optional(),
            inReplyTo: text.optional(),
            references: z.array(text),
            body,
            attachments: z.array(
              z
                .object({
                  partId: z.string(),
                  filename: z.string(),
                  mimeType: text,
                  size: z.number().int().nonnegative().safe(),
                })
                .strict(),
            ),
          })
          .strict()
          .transform(({ messageIdHeader, inReplyTo, ...message }) => ({
            ...message,
            ...(messageIdHeader === undefined ? {} : { messageIdHeader }),
            ...(inReplyTo === undefined ? {} : { inReplyTo }),
          })),
      )
      .min(1)
      .max(200),
    coverage: z
      .object({ messageBodies: z.literal("complete"), attachmentContents: z.literal("not-read") })
      .strict(),
  })
  .strict();
const observationSchema = z
  .object({
    observedAt: date,
    providerHistoryId: text.optional(),
    messages: z.array(
      z
        .object({
          id: text,
          labels: z.array(z.string()),
          direction: z.enum(["incoming", "sent", "unknown"]),
        })
        .strict(),
    ),
  })
  .strict();
const canonicalObservation = observationSchema.transform(
  ({ providerHistoryId, ...observation }) => ({
    ...observation,
    ...(providerHistoryId === undefined ? {} : { providerHistoryId }),
  }),
);
const submissionSchema = z
  .object({
    evidence: evidenceSchema,
    observation: canonicalObservation,
    jobId: z.uuid(),
    policyVersion: text.max(200),
    availableAt: z.date().refine((d) => Number.isFinite(d.getTime())),
  })
  .strict();

export interface EvidenceSubmission {
  evidence: ThreadEvidence;
  observation: ThreadObservation;
  jobId: string;
  policyVersion: string;
  availableAt: Date;
}
/** Parse into an independent snapshot; never surface Zod diagnostics containing input. */
export function snapshotSubmission(value: EvidenceSubmission) {
  const result = submissionSchema.safeParse(value);
  if (!result.success) throw new MailReadError("invalid-data");
  const input = result.data;
  const ids = new Set(input.evidence.messages.map((m) => m.id));
  if (
    ids.size !== input.evidence.messages.length ||
    input.observation.messages.length !== ids.size ||
    new Set(input.observation.messages.map((m) => m.id)).size !== ids.size ||
    input.observation.messages.some((m) => !ids.has(m.id))
  )
    throw new MailReadError("invalid-data");
  return {
    ...input,
    availableAt: new Date(input.availableAt),
    fingerprint: fingerprint(input.evidence),
  };
}

export function storedEvidence(
  value: unknown,
  expected: { mailbox: string; sourceId: string; fingerprint: string },
): ThreadEvidence {
  const parsed = evidenceSchema.safeParse(value);
  if (!parsed.success) throw new MailReadError("invalid-data");
  const evidence = parsed.data;
  if (
    evidence.source.mailbox !== expected.mailbox ||
    evidence.source.threadId !== expected.sourceId ||
    new Set(evidence.messages.map((m) => m.id)).size !== evidence.messages.length ||
    fingerprint(evidence) !== expected.fingerprint
  )
    throw new MailReadError("invalid-data");
  return evidence;
}
