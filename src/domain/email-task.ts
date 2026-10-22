import { createHash } from "node:crypto";
import { z } from "zod";
import type { ThreadEvidence } from "./mail-evidence.js";
import { type Direction, triageState } from "./mail-triage.js";

export const emailTaskVersion = "reviewed-email-tasks/v2";
// Policy revisions must not mint a fresh identity for unresolved remote writes.
const creationIdentity = "reviewed-email-tasks/v1";
export interface TaskProject {
  id: string;
  name: string;
  description: string;
  inbox: boolean;
}
export interface TaskConversation {
  evidence: ThreadEvidence;
  directions: Direction[];
}
export const taskCandidateSchema = z
  .object({
    sourceId: z.string().min(1),
    fingerprint: z.string().regex(/^mail-evidence\/v1:sha256:[a-f0-9]{64}$/),
    title: z.string().min(8).max(180),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
  })
  .strict();
export type TaskCandidate = z.infer<typeof taskCandidateSchema>;
export const taskReviewSchema = z
  .object({
    version: z.literal(emailTaskVersion),
    createdAt: z.iso.datetime(),
    retroIds: z.array(z.string().min(1)).max(50),
    candidates: z.array(taskCandidateSchema).max(10),
  })
  .strict();
export type TaskReview = z.infer<typeof taskReviewSchema>;
export function gmailLink(sourceId: string) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(sourceId)}`;
}
export function emailTaskKey(sourceId: string) {
  return `${creationIdentity}:${createHash("sha256").update(`primary\0${sourceId}`).digest("hex")}`;
}
function normalized(text: string) {
  return text
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function actionSentences(conversation: TaskConversation): string[] {
  const sentences: string[] = [];
  for (const [i, message] of [...conversation.evidence.messages.entries()].reverse()) {
    if (conversation.directions[i] === "sent" || !("text" in message.body)) continue;
    for (const part of message.body.text.split(/\n|(?<=[.!?])\s+/u)) {
      const line = normalized(part);
      if (line.startsWith(">") || line.length < 8 || line.length > 180 || sentences.includes(line))
        continue;
      sentences.push(line);
      if (sentences.length === 12) return sentences;
    }
  }
  return sentences;
}
export function taskTitles(conversation: TaskConversation) {
  return actionSentences(conversation)
    .map((text) => {
      const genericLink = /^(?:click|tap)\b|^(?:view|read|see|learn|find)\s+(?:this|more)\b/i.test(
        text,
      );
      const reviewNotification = /\breview (?:was|is|has been) requested\b/i.test(text);
      if (!genericLink && !reviewNotification) return { text, title: text };
      if (!/\b(?:review|view|read)\b/i.test(text)) return { text, title: undefined };
      const origin = conversation.evidence.messages.findLast(
        (m, i) =>
          conversation.directions[i] !== "sent" &&
          "text" in m.body &&
          m.body.text.split(/\n|(?<=[.!?])\s+/u).some((part) => normalized(part) === text),
      );
      const subject = normalized(origin?.subject ?? "").replace(/^(?:(?:re|fw|fwd):\s*)+/i, "");
      return { text, title: subject.length >= 3 ? `Review: ${subject}`.slice(0, 180) : undefined };
    })
    .filter(
      (candidate): candidate is { text: string; title: string } => candidate.title !== undefined,
    );
}
export function taskQuestion(conversation: TaskConversation, projects: TaskProject[]) {
  const supported = taskTitles(conversation);
  const candidates = supported.map((c) => c.text);
  const state = {
    ...triageState(conversation.evidence, conversation.directions),
    actionCandidates: candidates.map((text, i) => ({ ref: `a${i}`, text })),
    projects: projects.map((p, i) => ({ ref: `p${i}`, name: p.name, description: p.description })),
  };
  const question = { state, candidates, titles: supported.map((c) => c.title), projects };
  if (Buffer.byteLength(JSON.stringify(question)) > 32_768) throw new Error("input-too-large");
  return question;
}
export type TaskQuestion = ReturnType<typeof taskQuestion>;
export function taskAnswer(raw: unknown, question: TaskQuestion) {
  const answer = z
    .object({
      model: z.literal("jev-1.13.0"),
      answers: z.object({
        eligibility: z.object({
          type: z.literal("choice"),
          choice: z.enum(["required", "none", "conditional", "resolved", "unknown"]),
        }),
        action: z.object({ type: z.literal("choice"), choice: z.string() }),
        project: z.object({ type: z.literal("choice"), choice: z.string() }),
      }),
    })
    .parse(raw).answers;
  const action = ["none", "unknown", ...question.candidates.map((_, i) => `a${i}`)];
  const destinations = ["unknown", ...question.projects.map((_, i) => `p${i}`)];
  if (!action.includes(answer.action.choice) || !destinations.includes(answer.project.choice))
    throw new Error("invalid-answer");
  if (
    answer.eligibility.choice !== "required" ||
    ["none", "unknown"].includes(answer.action.choice)
  )
    return undefined;
  const title = question.titles[Number(answer.action.choice.slice(1))];
  const project =
    answer.project.choice === "unknown"
      ? question.projects.find((p) => p.inbox)
      : question.projects[Number(answer.project.choice.slice(1))];
  if (!title || !project) throw new Error("invalid-answer");
  return { title, projectId: project.id, projectName: project.name };
}
