import { createHash } from "node:crypto";
import { z } from "zod";
import { briefInputHash } from "./email-brief.js";
import { type TaskConversation, type TaskProject, taskAnswer, taskQuestion } from "./email-task.js";

export const capturePolicy = "automatic-email-capture/v1";
export interface CaptureTask {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  sourceIds: string[];
}
export interface CaptureInventory {
  projects: TaskProject[];
  tasks: CaptureTask[];
}
export function captureHash(fingerprint: string, directions: TaskConversation["directions"]) {
  return createHash("sha256")
    .update(`${capturePolicy}:${briefInputHash(fingerprint, directions)}`)
    .digest("hex");
}
export function inventoryHash(inventory: CaptureInventory) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        projects: [...inventory.projects].sort((a, b) => a.id.localeCompare(b.id)),
        tasks: [...inventory.tasks]
          .map((t) => ({ ...t, sourceIds: [...t.sourceIds].sort() }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex");
}
export function captureQuestion(conversation: TaskConversation, inventory: CaptureInventory) {
  if (
    inventory.tasks.length > 100 ||
    new Set(inventory.tasks.map((t) => t.id)).size !== inventory.tasks.length
  )
    throw new Error("invalid-inventory");
  const question = taskQuestion(conversation, inventory.projects);
  const result = {
    ...question,
    tasks: inventory.tasks,
    state: {
      ...question.state,
      existingTasks: inventory.tasks.map((t, i) => ({
        ref: `t${i}`,
        title: t.title,
        completed: t.completed,
      })),
    },
  };
  if (Buffer.byteLength(JSON.stringify(result)) > 32_768) throw new Error("input-too-large");
  return result;
}
export type CaptureQuestion = ReturnType<typeof captureQuestion>;
const decision = z.object({
  type: z.literal("choice"),
  choice: z.string(),
  confidence: z.number().finite().min(0).max(1),
});
export function captureAnswer(raw: unknown, question: CaptureQuestion) {
  const parsed = z
    .object({
      model: z.literal("jev-1.13.0"),
      answers: z.object({
        eligibility: decision,
        action: decision,
        project: decision,
        existing: decision,
      }),
      usage: z.object({
        input_tokens: z.number().int().nonnegative().max(64_000),
        output_tokens: z.number().int().nonnegative().safe(),
      }),
    })
    .parse(raw);
  const { existing, ...answers } = parsed.answers;
  const candidate = taskAnswer({ ...parsed, answers }, question);
  if (!["none", "unknown", ...question.tasks.map((_, i) => `t${i}`)].includes(existing.choice))
    throw new Error("invalid-match");
  if (parsed.answers.eligibility.confidence < 0.95)
    return { type: "review" as const, usage: parsed.usage };
  if (
    candidate !== undefined &&
    parsed.answers.eligibility.choice === "required" &&
    parsed.answers.eligibility.confidence >= 0.95 &&
    parsed.answers.action.confidence >= 0.95 &&
    existing.choice.startsWith("t") &&
    existing.confidence >= 0.95
  )
    return {
      type: "matched" as const,
      taskId: question.tasks[Number(existing.choice.slice(1))]?.id,
      usage: parsed.usage,
    };
  if (
    parsed.answers.eligibility.choice === "none" ||
    parsed.answers.eligibility.choice === "resolved"
  )
    return { type: "none" as const, usage: parsed.usage };
  if (
    !candidate ||
    Object.values(parsed.answers).some((a) => a.confidence < 0.95) ||
    existing.choice !== "none" ||
    question.projects.find((p) => p.id === candidate.projectId)?.inbox
  )
    return { type: "review" as const, usage: parsed.usage };
  return { type: "candidate" as const, candidate, usage: parsed.usage };
}
