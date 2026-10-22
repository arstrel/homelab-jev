import type { MailBudget } from "../application/mail-budget.js";
import { explicitGmailSources, type TodoistBriefInventory } from "../domain/todoist-brief.js";
import { todoistClient } from "./todoist.js";

export function todoistBrief(token: string, budget: MailBudget, retroId?: string) {
  const client = todoistClient(token, budget.signal);
  return {
    async read(): Promise<TodoistBriefInventory> {
      const projects: TodoistBriefInventory["projects"] = [];
      const excluded = new Set(retroId ? [retroId] : []);
      const projectIds = new Set<string>();
      const projectCursors = new Set<string>();
      let cursor: string | undefined;
      let projectsComplete = false;
      for (let page = 0; page < 5; page++) {
        const result = await budget.read(() =>
          client.getProjects({ limit: 100, ...(cursor ? { cursor } : {}) }),
        );
        if (result.results.length > 100) throw new Error("project-page-limit");
        for (const p of result.results) {
          if (p.id === retroId || p.name.trim().toLowerCase() === "retro") {
            excluded.add(p.id);
            continue;
          }
          if (!p.isArchived && !p.isDeleted && !p.isFrozen && !projectIds.has(p.id)) {
            projectIds.add(p.id);
            projects.push({ id: p.id, name: p.name });
          }
        }
        if (!result.nextCursor) {
          projectsComplete = true;
          break;
        }
        if (projectCursors.has(result.nextCursor)) throw new Error("project-pagination");
        projectCursors.add(result.nextCursor);
        cursor = result.nextCursor;
      }
      const tasks: TodoistBriefInventory["tasks"] = [];
      const seen = new Set<string>(),
        taskCursors = new Set<string>();
      let tasksComplete = false,
        retroExcluded = 0,
        unknownProjects = 0;
      cursor = undefined;
      for (let page = 0; page < 2; page++) {
        const result = await budget.read(() =>
          client.getTasks({ limit: 100, ...(cursor ? { cursor } : {}) }),
        );
        if (result.results.length > 100) throw new Error("task-page-limit");
        for (const t of result.results) {
          if (t.checked || t.isDeleted || t.completedAt || seen.has(t.id)) continue;
          seen.add(t.id);
          if (excluded.has(t.projectId)) {
            retroExcluded++;
            continue;
          }
          if (!projectIds.has(t.projectId)) {
            unknownProjects++;
            continue;
          }
          tasks.push({
            id: t.id,
            projectId: t.projectId,
            content: t.content,
            due: t.due
              ? {
                  date: t.due.date,
                  ...(t.due.datetime === undefined ? {} : { datetime: t.due.datetime }),
                  ...(t.due.timezone === undefined ? {} : { timezone: t.due.timezone }),
                }
              : null,
            sourceIds: explicitGmailSources(t.description),
          });
        }
        if (!result.nextCursor) {
          tasksComplete = true;
          break;
        }
        if (taskCursors.has(result.nextCursor)) throw new Error("task-pagination");
        taskCursors.add(result.nextCursor);
        cursor = result.nextCursor;
      }
      return { projects, tasks, projectsComplete, tasksComplete, unknownProjects, retroExcluded };
    },
  };
}
