import {
  emailTaskVersion,
  gmailLink,
  type TaskCandidate,
  type TaskConversation,
  type TaskProject,
  type TaskQuestion,
  type TaskReview,
  taskAnswer,
  taskQuestion,
  taskTitles,
} from "../domain/email-task.js";
import { fingerprint } from "../domain/mail-evidence.js";
import type { MailBudget } from "./mail-budget.js";

export interface EmailTaskWriter {
  current(sourceId: string): Promise<TaskConversation | undefined>;
  reserve(
    candidate: TaskCandidate,
  ): Promise<
    | { status: "ready"; requestId: string }
    | { status: "linked"; taskId: string }
    | { status: "ambiguous" | "suppressed" }
  >;
  complete(candidate: TaskCandidate, requestId: string, taskId: string): Promise<void>;
}
export interface EmailTaskDatabase {
  sample(offset: number): Promise<TaskConversation[]>;
  exclusive<T>(run: (writer: EmailTaskWriter) => Promise<T>): Promise<T | undefined>;
  close(): Promise<void>;
}
export interface EmailTaskRemote {
  projects(): Promise<TaskProject[]>;
  create(candidate: TaskCandidate, requestId: string): Promise<string>;
}
export type TaskJudge = (question: TaskQuestion, signal: AbortSignal) => Promise<unknown>;
export function taskDestinations(projects: TaskProject[], configuredRetro?: string) {
  const retroIds = projects
    .filter((p) => p.name.trim().toLowerCase() === "retro" || p.id === configuredRetro)
    .map((p) => p.id);
  const allowed = projects.filter((p) => !retroIds.includes(p.id));
  if (!allowed.length || allowed.length > 50 || !allowed.some((p) => p.inbox))
    throw new Error("invalid-projects");
  return { allowed, retroIds };
}
export async function previewEmailTasks(
  conversations: TaskConversation[],
  projects: TaskProject[],
  judge: TaskJudge,
  budget: MailBudget,
  now: Date,
  retro?: string,
) {
  if (conversations.length > 10) throw new Error("invalid-sample");
  const { allowed, retroIds } = taskDestinations(projects, retro);
  const review: TaskReview = {
    version: emailTaskVersion,
    createdAt: now.toISOString(),
    retroIds,
    candidates: [],
  };
  const outcomes: Array<{ sample: number; status: string }> = [];
  for (const [i, conversation] of conversations.entries()) {
    try {
      budget.assertActive();
      const question = taskQuestion(conversation, allowed);
      if (!question.candidates.length) {
        outcomes.push({ sample: i + 1, status: "no-short-source-sentence" });
        continue;
      }
      const answer = taskAnswer(await budget.read(() => judge(question, budget.signal)), question);
      budget.assertActive();
      if (answer)
        review.candidates.push({
          sourceId: conversation.evidence.source.threadId,
          fingerprint: fingerprint(conversation.evidence),
          ...answer,
        });
      outcomes.push({ sample: i + 1, status: answer ? "proposed" : "no-clear-action" });
    } catch {
      outcomes.push({ sample: i + 1, status: "not-proposed" });
      if (budget.signal.aborted) break;
    }
  }
  return { review, outcomes };
}
export async function applyEmailTasks(
  review: TaskReview,
  indices: number[],
  projects: TaskProject[],
  writer: EmailTaskWriter,
  remote: EmailTaskRemote,
  budget: MailBudget,
  retro?: string,
) {
  const { allowed, retroIds } = taskDestinations(projects, retro);
  const results: Array<{ candidate: number; status: string; taskId?: string; source?: string }> =
    [];
  for (const index of indices) {
    const candidate = review.candidates[index - 1];
    if (!candidate) throw new Error("invalid-selection");
    try {
      budget.assertActive();
      const current = await writer.current(candidate.sourceId);
      const project = allowed.find(
        (p) => p.id === candidate.projectId && p.name === candidate.projectName,
      );
      if (!project || retroIds.includes(project.id) || review.retroIds.includes(project.id)) {
        results.push({ candidate: index, status: "destination-changed" });
        continue;
      }
      if (
        !current ||
        fingerprint(current.evidence) !== candidate.fingerprint ||
        !taskTitles(current).some((c) => c.title === candidate.title)
      ) {
        results.push({ candidate: index, status: "stale-or-invalid-proposal" });
        continue;
      }
      const reservation = await writer.reserve(candidate);
      if (reservation.status !== "ready") {
        results.push({ candidate: index, ...reservation });
        if (reservation.status === "ambiguous") break;
        continue;
      }
      // The durable intent is already ambiguous: never blindly re-create after a lost response.
      try {
        budget.assertActive();
        const taskId = await remote.create(candidate, reservation.requestId);
        if (!taskId) throw new Error("missing-task-id");
        await writer.complete(candidate, reservation.requestId, taskId);
        results.push({
          candidate: index,
          status: "created",
          taskId,
          source: gmailLink(candidate.sourceId),
        });
      } catch {
        results.push({ candidate: index, status: "ambiguous" });
        break;
      }
    } catch {
      results.push({ candidate: index, status: "not-created" });
      break;
    }
  }
  return results;
}
