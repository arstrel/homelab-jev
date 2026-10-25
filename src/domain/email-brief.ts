import { createHash } from "node:crypto";
import { z } from "zod";
import { briefText } from "./brief-text.js";
import { gmailLink, type TaskConversation } from "./email-task.js";
import type { MailStatusSnapshot } from "./mail-status.js";
import { triagePolicy, triageResultSchema } from "./mail-triage.js";
import type { renderRetroContext } from "./retro.js";
import { type renderTodoistContext, todoistTaskLink } from "./todoist-brief.js";

export const briefPolicy = `email-brief/v1:${triagePolicy}:owner-rules/v1`;
export const briefModel = "jev-1.13.0";
export const briefDestination = "email-brief:primary";
export const briefDecisionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("jev"), result: triageResultSchema }).strict(),
  z
    .object({
      type: z.literal("owner-rule"),
      reason: z.enum(["ignored-routine-github", "ignored-google-cloud-terms"]),
    })
    .strict(),
]);
export type BriefDecision = z.infer<typeof briefDecisionSchema>;
export const savedBriefSchema = z
  .object({
    policy: z.literal(briefPolicy),
    inputHash: z.string().regex(/^[a-f0-9]{64}$/),
    decision: briefDecisionSchema,
  })
  .strict();
export type SavedBriefDecision = z.infer<typeof savedBriefSchema>;
export const briefPublicationSchema = z
  .object({
    fileId: z.string().regex(/^[A-Za-z0-9_-]{10,200}$/),
    lastPublished: z
      .object({ generation: z.string().uuid(), publishedAt: z.iso.datetime() })
      .strict()
      .nullable(),
  })
  .strict();
export type BriefPublication = z.infer<typeof briefPublicationSchema>;
export type BriefFailure =
  | "invalid-evidence"
  | "invalid-cache"
  | "input-too-large"
  | "invalid-result"
  | "provider-error"
  | "new-call-cap"
  | "cancelled";
export const captureAnnotationSchema = z.object({
  state: z.enum([
    "created",
    "matched",
    "matched-completed",
    "review",
    "none",
    "skipped",
    "failed",
    "capped",
    "ambiguous",
  ]),
  taskId: z.string().min(1).optional(),
});
export type CaptureAnnotation = z.infer<typeof captureAnnotationSchema>;
export interface BriefEntry {
  sourceId: string;
  subject: string;
  receivedAt: string | null;
  decision?: BriefDecision;
  failure?: BriefFailure;
  capture?: CaptureAnnotation;
}
export function briefInputHash(fingerprint: string, directions: TaskConversation["directions"]) {
  return createHash("sha256")
    .update(JSON.stringify({ fingerprint, directions, policy: briefPolicy, model: briefModel }))
    .digest("hex");
}
export function briefSource(
  conversation: TaskConversation,
): Omit<BriefEntry, "decision" | "failure"> {
  const messages = conversation.evidence.messages;
  const latest = messages.reduce<string | null>(
    (last, message) => (!last || message.receivedAt > last ? message.receivedAt : last),
    null,
  );
  const subject =
    messages.findLast((m, i) => conversation.directions[i] !== "sent" && m.subject.trim())
      ?.subject ??
    messages.at(-1)?.subject ??
    "(No subject)";
  return {
    sourceId: conversation.evidence.source.threadId,
    subject: subject || "(No subject)",
    receivedAt: latest,
  };
}
export function briefGroup(entry: BriefEntry) {
  if (!entry.decision || entry.failure) return "Uncertain / review";
  if (entry.decision.type === "owner-rule") return "Handled elsewhere / owner exclusions";
  const { kind, attention, lifecycle } = entry.decision.result.answers;
  if (
    [kind.choice, attention.choice, lifecycle.choice].includes("unknown") ||
    lifecycle.choice === "resolution-suggested"
  )
    return "Uncertain / review";
  if (lifecycle.choice === "waiting") return "Waiting";
  return { action: "Action", fyi: "FYI", noise: "Noise", unknown: "Uncertain / review" }[
    attention.choice
  ];
}
export interface CaptureRun {
  created?: number;
  matched?: number;
  review?: number;
  failed?: number;
  capped?: number;
  budgetExhausted?: boolean;
  ambiguous?: boolean;
  overlapping?: boolean;
}
export interface BriefDocument {
  generation: string;
  generatedAt: string;
  since: string;
  until: string;
  eligible: number;
  status: MailStatusSnapshot;
  entries: BriefEntry[];
  captureRun?: CaptureRun;
  todoist?: ReturnType<typeof renderTodoistContext>;
  retro?: ReturnType<typeof renderRetroContext>;
  retroReview?: string;
}
export function renderEmailBrief(doc: BriefDocument) {
  const s = doc.status;
  const lines = [
    "# Jev email brief",
    "",
    `Generation: ${doc.generation}`,
    `Generated: ${doc.generatedAt}`,
    `Model: ${briefModel}; policy: ${briefPolicy}; judgments: uncalibrated.`,
    "",
    "## Coverage and source state",
    "",
    `- Sample: ${doc.entries.length} of ${doc.eligible} eligible complete stored conversations, newest message first.`,
    `- Message window: ${doc.since} through ${doc.until}. Stored evidence only; older and uncollected mail is outside this sample.`,
    `- Gmail discovery checked: ${s.discoveryCheckedAt ?? "never / unknown"}.`,
    `- Complete evidence freshness: ${s.evidenceSyncedAt ?? "not established"}.`,
    `- Pending retrievals: ${s.retrievals?.pending ?? "unknown"}; retries: ${s.retrievals?.retrying ?? "unknown"}; pending classification jobs: ${s.classification?.pendingJobs ?? "unknown"}.`,
    `- Retrieval failures: ${
      Object.entries(s.retrievals?.failures ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "none recorded"
    }.`,
    `- Unreplayed history gap: ${s.recovery?.historyGap ? "yes" : "no recorded gap"}.`,
    `- Source observation captured: ${doc.until}. Generation time does not advance source freshness.`,
    "- Todoist and Retro context: see the sections below. Calendar context: not included. No tasks were created or completed.",
    "",
    "Read source conversations before acting. Sections are typed triage over this sample, not a complete obligation inventory.",
    "",
  ];
  for (const group of [
    "Action",
    "FYI",
    "Noise",
    "Waiting",
    "Uncertain / review",
    "Handled elsewhere / owner exclusions",
  ]) {
    lines.push(`## ${group}`, "");
    const entries = doc.entries.filter((entry) => briefGroup(entry) === group);
    if (!entries.length) lines.push("_None in this sample._", "");
    for (const entry of entries) {
      let detail: string;
      if (entry.failure) detail = `unclassified: ${entry.failure}`;
      else if (entry.decision?.type === "owner-rule")
        detail = `deterministic owner rule: ${entry.decision.reason}; no Jev call required`;
      else if (entry.decision?.type === "jev")
        detail = Object.entries(entry.decision.result.answers)
          .map(([key, a]) => `${key}: ${a.choice} (${Math.round(a.confidence * 100)}% confidence)`)
          .join("; ");
      else detail = "unclassified";
      const tracked =
        group === "Action"
          ? (doc.todoist?.tasks.filter((t) => t.sourceIds.includes(entry.sourceId)) ?? [])
          : [];
      const association = tracked.length
        ? ` Already tracked (explicit source link): ${tracked
            .slice(0, 3)
            .map((t) => `[Todoist task](${todoistTaskLink(t.id)})`)
            .join(
              ", ",
            )}${tracked.length > 3 ? `; ${tracked.length - 3} additional linked tasks in the task section` : ""}.`
        : "";
      const capture = entry.capture
        ? ` Capture history: ${entry.capture.state}${entry.capture.taskId ? ` ([Todoist task](${todoistTaskLink(entry.capture.taskId)}))` : ""}; live Todoist state remains authoritative.`
        : "";
      lines.push(
        `- [${briefText(entry.subject)}](${gmailLink(entry.sourceId)}) — ${entry.receivedAt ?? "time unknown"}; ${detail}.${association}${capture}`,
        "",
      );
    }
  }
  if (doc.captureRun) {
    const c = doc.captureRun;
    lines.push(
      "## Email task capture",
      "",
      `This cycle: ${c.created ?? 0} created; ${c.matched ?? 0} matched; ${c.review ?? 0} need review; ${c.failed ?? 0} failed; ${c.capped ?? 0} deferred by the daily limit.`,
      ...(c.budgetExhausted
        ? ["New inference stopped at the approved lifetime spending limit."]
        : []),
      ...(c.ambiguous
        ? [
            "A task write has an uncertain outcome. Creation stopped; inspect existing tasks before retrying.",
          ]
        : []),
      ...(c.overlapping ? ["Capture skipped because another task writer owns the cycle."] : []),
      "Existing task fields and completion remain owned by the user. Capture history is bounded processing evidence, not a substitute for live Todoist state.",
      "",
    );
  }
  lines.push(
    doc.todoist?.markdown ??
      "## Todoist tasks by project\n\nTodoist context unavailable: not requested.\n",
  );
  if (doc.retro) lines.push(doc.retro.markdown);
  if (doc.retroReview) lines.push(doc.retroReview);
  return lines.join("\n");
}
