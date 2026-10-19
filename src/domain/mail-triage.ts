import { z } from "zod";
import { completeBodies, type ThreadEvidence } from "./mail-evidence.js";

export const triagePolicy = "mail-triage/v1";
export const triageModels = ["jev-1.13.0"] as const;
export type TriageModel = (typeof triageModels)[number];
export type Direction = "incoming" | "sent" | "unknown";
export const triageChoices = {
  kind: {
    personal: "Personal conversation or direct correspondence.",
    notification:
      "Automated transactional, account, service or system notification; it may require action.",
    newsletter: "Subscription, promotional or broadcast content.",
    unknown: "Insufficient or conflicting evidence about message kind.",
  },
  attention: {
    action:
      "Evidence supports a concrete outstanding action by the mailbox owner, including automated notices.",
    fyi: "Useful information with no supported outstanding action by the mailbox owner.",
    noise:
      "No useful personal information or supported action; promotional or irrelevant material.",
    unknown: "Whether the mailbox owner has an outstanding action is unclear.",
  },
  lifecycle: {
    request: "A request or commitment appears outstanding; no supported later resolution.",
    waiting: "The mailbox owner's sent response supports waiting for another person or event.",
    "resolution-suggested":
      "Later evidence suggests resolution; this is a review suggestion, never permission to complete a task.",
    none: "No obligation lifecycle evidence is present.",
    unknown: "The lifecycle is ambiguous or available text is insufficient.",
  },
} as const;
export class TriageError extends Error {
  constructor(
    readonly reason: "missing-evidence" | "invalid-evidence" | "input-too-large" | "invalid-result",
  ) {
    super(reason);
  }
}
export function triageState(evidence: ThreadEvidence, directions: readonly Direction[]) {
  if (!evidence.messages.length || !completeBodies(evidence))
    throw new TriageError("invalid-evidence");
  const state = {
    attachmentContents: "not-read",
    messages: evidence.messages.map((message, i) => ({
      ref: i + 1,
      receivedAt: message.receivedAt,
      direction: directions[i] ?? "unknown",
      subject: message.subject,
      text: "text" in message.body ? message.body.text : "",
    })),
  };
  if (Buffer.byteLength(JSON.stringify(state)) > 32_768) throw new TriageError("input-too-large");
  return state;
}
export type TriageState = ReturnType<typeof triageState>;
const probability = z.number().finite().min(0).max(1);
function answer<const T extends Record<string, string>>(criteria: T) {
  return z
    .object({
      type: z.literal("choice"),
      choice: z.enum(Object.keys(criteria) as [keyof T & string, ...(keyof T & string)[]]),
      confidence: probability,
      probabilities: z
        .object(Object.fromEntries(Object.keys(criteria).map((key) => [key, probability])))
        .strict(),
    })
    .strict();
}
export const triageResultSchema = z
  .object({
    model: z.enum(triageModels),
    answers: z
      .object({
        kind: answer(triageChoices.kind),
        attention: answer(triageChoices.attention),
        lifecycle: answer(triageChoices.lifecycle),
      })
      .strict(),
    usage: z
      .object({
        input_tokens: z.number().int().nonnegative().safe(),
        output_tokens: z.number().int().nonnegative().safe(),
      })
      .strict(),
  })
  .strict();
export function triageResult(value: unknown, model: TriageModel) {
  const parsed = triageResultSchema.safeParse(value);
  if (!parsed.success || parsed.data.model !== model) throw new TriageError("invalid-result");
  return parsed.data;
}
