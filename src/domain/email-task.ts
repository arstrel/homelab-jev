import { createHash } from "node:crypto";
import { z } from "zod";
import type { ThreadEvidence } from "./mail-evidence.js";
import { type Direction, triageState } from "./mail-triage.js";

export const emailTaskVersion = "reviewed-email-tasks/v1";
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
  return `${emailTaskVersion}:${createHash("sha256").update(`primary\0${sourceId}`).digest("hex")}`;
}
export function actionSentences(conversation: TaskConversation): string[] {
  const sentences: string[] = [];
  for (const [i, message] of [...conversation.evidence.messages.entries()].reverse()) {
    if (conversation.directions[i] === "sent" || !("text" in message.body)) continue;
    for (const part of message.body.text.split(/\n|(?<=[.!?])\s+/u)) {
      const line = part
        .replace(/\p{Cc}/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (line.startsWith(">") || line.length < 8 || line.length > 180 || sentences.includes(line))
        continue;
      sentences.push(line);
      if (sentences.length === 12) return sentences;
    }
  }
  return sentences;
}
export function taskQuestion(conversation: TaskConversation, projects: TaskProject[]) {
  const candidates = actionSentences(conversation);
  const state = {
    ...triageState(conversation.evidence, conversation.directions),
    actionCandidates: candidates.map((text, i) => ({ ref: `a${i}`, text })),
    projects: projects.map((p, i) => ({ ref: `p${i}`, name: p.name, description: p.description })),
  };
  const question = { state, candidates, projects };
  if (Buffer.byteLength(JSON.stringify(question)) > 32_768) throw new Error("input-too-large");
  return question;
}
export type TaskQuestion = ReturnType<typeof taskQuestion>;
export function taskAnswer(raw: unknown, question: TaskQuestion) {
  const answer = z
    .object({
      model: z.literal("jev-1.13.0"),
      answers: z.object({
        action: z.object({ type: z.literal("choice"), choice: z.string() }),
        project: z.object({ type: z.literal("choice"), choice: z.string() }),
      }),
    })
    .parse(raw).answers;
  const action = ["none", "unknown", ...question.candidates.map((_, i) => `a${i}`)];
  const destinations = ["unknown", ...question.projects.map((_, i) => `p${i}`)];
  if (!action.includes(answer.action.choice) || !destinations.includes(answer.project.choice))
    throw new Error("invalid-answer");
  if (["none", "unknown"].includes(answer.action.choice)) return undefined;
  const title = question.candidates[Number(answer.action.choice.slice(1))];
  const project =
    answer.project.choice === "unknown"
      ? question.projects.find((p) => p.inbox)
      : question.projects[Number(answer.project.choice.slice(1))];
  if (!title || !project) throw new Error("invalid-answer");
  return { title, projectId: project.id, projectName: project.name };
}
