import type { RetroEntry } from "../domain/retro.js";
import {
  evidenceSentences,
  kindRequest,
  matchRequest,
  type RetroAnswer,
  type RetroRequest,
  type RetroResult,
  type RetroReview,
  retroResult,
  reviewLabel,
  validateRetroRequest,
} from "../domain/retro-review.js";
import type { TodoistBriefTask } from "../domain/todoist-brief.js";

export async function reviewRetro(
  entries: RetroEntry[],
  suppliedTasks: TodoistBriefTask[],
  requested: boolean,
  inputsComplete: boolean,
  call: (request: RetroRequest) => Promise<unknown | undefined>,
  signal?: AbortSignal,
): Promise<RetroReview> {
  const tasks = suppliedTasks.slice(0, 50),
    kinds = new Map<string, RetroAnswer>();
  const review: RetroReview = {
    requested,
    complete: inputsComplete && suppliedTasks.length <= 50,
    kinds: tasks.map((task) => ({ task })),
    suggestions: [],
    omittedTasks: Math.max(0, suppliedTasks.length - 50),
  };
  if (!requested) return review;
  const invoke = async (request: RetroRequest): Promise<RetroResult | undefined> => {
    signal?.throwIfAborted();
    validateRetroRequest(request);
    const raw = await call(request);
    signal?.throwIfAborted();
    return raw === undefined ? undefined : retroResult(raw, request);
  };
  for (let i = 0; entries.length && i < tasks.length; i += 10) {
    const batch = tasks.slice(i, i + 10);
    try {
      const result = await invoke(kindRequest(batch));
      if (!result) {
        review.complete = false;
        break;
      }
      batch.forEach((t, j) => {
        const answer = result.answers[`k${j}`];
        if (answer) kinds.set(t.id, answer);
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      review.complete = false;
    }
  }
  review.kinds = tasks.map((task) => {
    const answer = kinds.get(task.id);
    return { task, ...(answer ? { answer } : {}) };
  });
  for (const entry of entries) {
    if (!entry.owner || !tasks.length || !evidenceSentences(entry).length) {
      review.suggestions.push({
        entry,
        label: "Uncertain — review",
        failure: !entry.owner
          ? "source author not established as owner"
          : !tasks.length
            ? "no supplied current task candidates"
            : "no bounded supporting excerpts",
      });
      review.complete = false;
      continue;
    }
    try {
      const result = await invoke(matchRequest(entry, tasks));
      if (!result) {
        review.suggestions.push({
          entry,
          label: "Uncertain — review",
          failure: "new-call cap or judgment disabled",
        });
        review.complete = false;
        continue;
      }
      const taskRef = result.answers.task?.choice ?? "unknown";
      const task = /^t\d+$/.test(taskRef) ? tasks[Number(taskRef.slice(1))] : undefined;
      const evidenceRef = result.answers.evidence?.choice ?? "unknown";
      const evidence = /^e\d+$/.test(evidenceRef)
        ? evidenceSentences(entry)[Number(evidenceRef.slice(1))]
        : undefined;
      const label = reviewLabel(
        task ? kinds.get(task.id) : undefined,
        result.answers,
        task,
        entry.owner,
        evidence,
      );
      review.suggestions.push({
        entry,
        label,
        ...(task ? { task } : {}),
        ...(evidence ? { evidence } : {}),
        confidence: Math.min(
          ...Object.values(result.answers).map((a) => a.confidence),
          task ? (kinds.get(task.id)?.confidence ?? 0) : 1,
        ),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      review.complete = false;
      review.suggestions.push({
        entry,
        label: "Uncertain — review",
        failure: "invalid, oversized or failed judgment",
      });
    }
  }
  return review;
}
