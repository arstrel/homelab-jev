import { briefText } from "./brief-text.js";

export interface TodoistBriefTask {
  id: string;
  projectId: string;
  content: string;
  due: { date: string; datetime?: string | null; timezone?: string | null } | null;
  sourceIds: string[];
}
export interface TodoistBriefInventory {
  projects: { id: string; name: string }[];
  tasks: TodoistBriefTask[];
  projectsComplete: boolean;
  tasksComplete: boolean;
  unknownProjects: number;
  retroExcluded: number;
}
export type TodoistBriefContext =
  | ({ state: "available"; startedAt: string; readAt: string } & TodoistBriefInventory)
  | {
      state: "unavailable";
      startedAt: string;
      readAt: null;
      reason: "missing-token" | "read-failed";
    };

/** Exact supported conversation permalinks only; no word/subject matching. */
export function explicitGmailSources(description: string): string[] {
  const ids = new Set<string>();
  for (const match of description.matchAll(/https:\/\/[^\s<>[\]()"'`]+/g)) {
    try {
      const url = new URL(match[0]);
      if (
        url.origin !== "https://mail.google.com" ||
        url.username ||
        url.password ||
        url.search ||
        url.pathname !== "/mail/u/0/"
      )
        continue;
      const source = /^#(?:all|inbox|sent)\/([^/?#]+)$/.exec(url.hash)?.[1];
      if (source) ids.add(decodeURIComponent(source));
    } catch {
      /* Malformed links are data, never authority. */
    }
  }
  return [...ids];
}
export function todoistTaskLink(id: string) {
  return `https://app.todoist.com/app/task/${encodeURIComponent(id).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}
export function renderTodoistContext(context: TodoistBriefContext) {
  const lines = ["## Todoist tasks by project", "", `Read started: ${context.startedAt}.`, ""];
  if (context.state === "unavailable") {
    lines.push(
      `Todoist context unavailable: ${context.reason}. No current inventory or link associations are claimed.`,
      "",
    );
    return {
      markdown: lines.join("\n"),
      tasks: [] as TodoistBriefTask[],
      complete: false,
      omitted: 0,
    };
  }
  lines.push(
    `Read completed: ${context.readAt}. These pages are a live read interval, not an atomic snapshot.`,
    `Returned: ${context.tasks.length} included open tasks in ${context.projects.length} active non-Retro projects; Retro tasks excluded: ${context.retroExcluded}; tasks with unavailable projects omitted: ${context.unknownProjects}.`,
    `Project pages complete: ${context.projectsComplete}; task pages complete: ${context.tasksComplete}. Limits: 500 projects / 200 returned tasks.`,
    "Todoist is authoritative. Task titles and due values are copied source data; optional activities are not inferred obligations. Retro feedback and Calendar context are not included.",
    "Already-tracked annotations use only explicit supported Gmail links on displayed open tasks. An association does not prove completion; absent links or omitted tasks do not prove that work is untracked.",
    "",
  );
  const tasks: TodoistBriefTask[] = [];
  let bytes = Buffer.byteLength(lines.join("\n"));
  for (const project of context.projects) {
    let heading = `### ${briefText(project.name)}\n\n`;
    for (const task of context.tasks.filter((t) => t.projectId === project.id)) {
      const due = task.due
        ? `date: ${briefText(task.due.date)}${task.due.datetime ? `; datetime: ${briefText(task.due.datetime)}` : ""}${task.due.timezone ? `; timezone: ${briefText(task.due.timezone)}` : ""}`
        : "not set";
      const line = `${heading}- [${briefText(task.content)}](${todoistTaskLink(task.id)}) — due ${due}.\n`;
      if (bytes + Buffer.byteLength(line) > 23_000) continue;
      lines.push(line);
      bytes += Buffer.byteLength(line) + 1;
      heading = "";
      tasks.push(task);
    }
  }
  const omitted = context.tasks.length - tasks.length;
  const complete =
    context.projectsComplete &&
    context.tasksComplete &&
    context.unknownProjects === 0 &&
    omitted === 0;
  lines.push(
    `Displayed: ${tasks.length}; omitted by display size limit: ${omitted}. Todoist coverage: ${complete ? "complete for returned active project/task pages" : "INCOMPLETE"}.`,
    "",
  );
  if (!tasks.length)
    lines.push(
      complete
        ? "_No open tasks returned outside Retro._"
        : "_No displayable tasks; this is not proof of an empty inventory._",
      "",
    );
  return { markdown: lines.join("\n"), tasks, complete, omitted };
}
