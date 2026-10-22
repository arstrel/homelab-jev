import type { RetroEntry, RetroRead } from "../../src/domain/retro.js";
import type { RetroRequest } from "../../src/domain/retro-review.js";
import type { TodoistBriefTask } from "../../src/domain/todoist-brief.js";

export const retroInstant = "2026-10-22T13:00:00.000Z";
export function retroEntry(text = "I finished setting up remote access."): RetroEntry {
  return {
    key: "task:retro-1:complete",
    taskId: "retro-1",
    at: retroInstant,
    basis: "completed",
    text,
    owner: true,
  };
}
export function retroRead(entries: RetroEntry[] = []): RetroRead {
  return {
    entries,
    complete: true,
    scannedTasks: entries.length,
    commentTasks: entries.length,
    undated: 0,
    omittedEntries: 0,
    attachments: 0,
    foreignAuthors: 0,
  };
}
export function retroTasks(): TodoistBriefTask[] {
  return [
    { id: "access", projectId: "home", content: "Set up remote access", due: null, sourceIds: [] },
    { id: "backup", projectId: "home", content: "Configure backups", due: null, sourceIds: [] },
    {
      id: "rowing",
      projectId: "fitness",
      content: "Rowing workout option",
      due: null,
      sourceIds: [],
    },
    {
      id: "study",
      projectId: "study",
      content: "Earn a professional certification",
      due: null,
      sourceIds: [],
    },
  ];
}
export function retroResponse(
  request: RetroRequest,
  selections: Record<string, string> = {},
  confidence = 0.98,
) {
  return {
    model: "jev-1.13.0",
    answers: Object.fromEntries(
      Object.entries(request.questions).map(([key, q]) => {
        const selected = selections[key] ?? (key.startsWith("k") ? "finite" : "none");
        return [
          key,
          {
            type: "choice",
            choice: selected,
            confidence,
            probabilities: Object.fromEntries(
              Object.keys(q.criteria).map((k) => [k, k === selected ? 1 : 0]),
            ),
          },
        ];
      }),
    ),
    usage: { input_tokens: 100, output_tokens: 10 },
  };
}
export function todoistComment(id = "comment-1", extra = {}) {
  return {
    id,
    item_id: "retro-1",
    content: "I finished setting up remote access.",
    posted_at: retroInstant,
    file_attachment: null,
    posted_uid: "owner",
    uids_to_notify: null,
    reactions: null,
    is_deleted: false,
    ...extra,
  };
}
