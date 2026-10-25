import type { Task } from "@doist/todoist-sdk";
import { taskDestinations } from "../application/email-tasks.js";
import type { MailBudget } from "../application/mail-budget.js";
import type { CaptureInventory, CaptureTask } from "../domain/automatic-capture.js";
import { explicitGmailSources } from "../domain/todoist-brief.js";
import { todoistClient } from "./todoist.js";
import { todoistEmailTasks } from "./todoist-email-tasks.js";

export function todoistCapture(token: string, budget: MailBudget, retroId?: string) {
  const client = todoistClient(token, budget.signal),
    remote = todoistEmailTasks(token, budget.signal);
  return {
    create: remote.create,
    async inventory(now: Date): Promise<CaptureInventory> {
      const { allowed: projects, retroIds } = taskDestinations(
        await budget.read(() => remote.projects()),
        retroId,
      );
      const excluded = new Set(retroIds),
        tasks = new Map<string, CaptureTask>();
      if (retroId) excluded.add(retroId);
      const add = (task: Task, completed: boolean) => {
        if (excluded.has(task.projectId) || task.isDeleted) return;
        if (tasks.has(task.id)) return;
        tasks.set(task.id, {
          id: task.id,
          projectId: task.projectId,
          title: task.content,
          completed,
          sourceIds: explicitGmailSources(task.description),
        });
      };
      for (const completed of [false, true]) {
        let cursor: string | undefined;
        const seen = new Set<string>();
        for (let page = 0; page < 2; page++) {
          const args = { limit: 100, ...(cursor ? { cursor } : {}) };
          const result = completed
            ? await budget.read(() =>
                client.getCompletedTasksByCompletionDate({
                  ...args,
                  since: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
                  until: now.toISOString(),
                }),
              )
            : await budget.read(() => client.getTasks(args));
          const rows = "items" in result ? result.items : result.results;
          if (rows.length > 100) throw new Error("task-page-limit");
          for (const task of rows) add(task, completed || task.checked || !!task.completedAt);
          if (tasks.size > 100) throw new Error("task-inventory-limit");
          if (!result.nextCursor) break;
          if (page === 1 || seen.has(result.nextCursor)) throw new Error("task-pagination");
          seen.add(result.nextCursor);
          cursor = result.nextCursor;
        }
      }
      return { projects, tasks: [...tasks.values()] };
    },
  };
}
