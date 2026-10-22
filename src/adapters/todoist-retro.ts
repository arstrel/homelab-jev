import type { Task } from "@doist/todoist-sdk";
import type { MailBudget } from "../application/mail-budget.js";
import type { RetroEntry, RetroRead } from "../domain/retro.js";
import { todoistClient } from "./todoist.js";

export function todoistRetro(token: string, budget: MailBudget) {
  const client = todoistClient(token, budget.signal);
  return {
    async read(projectId: string, since: string, until: string): Promise<RetroRead> {
      const tasks = new Map<string, Task>();
      let complete = true,
        undated = 0,
        attachments = 0,
        foreignAuthors = 0;
      const within = (at: string) => at >= since && at <= until;
      const entries = new Map<string, RetroEntry>();
      const addTask = (t: Task) => {
        if (t.projectId !== projectId || t.isDeleted) return;
        const old = tasks.get(t.id);
        if (!old || (t.updatedAt?.getTime() ?? 0) > (old.updatedAt?.getTime() ?? 0))
          tasks.set(t.id, t);
        const date = t.completedAt ?? t.updatedAt ?? t.addedAt;
        if (!date) {
          undated++;
          complete = false;
          return;
        }
        const at = date.toISOString();
        if (!within(at)) return;
        const text = [t.content, t.description].filter(Boolean).join("\n");
        if (!text.trim()) return;
        const owner = t.addedByUid === t.userId;
        if (!owner) foreignAuthors++;
        const key = `task:${t.id}:${t.completedAt?.toISOString() ?? "open"}`;
        entries.set(key, {
          key,
          taskId: t.id,
          at,
          basis: t.completedAt ? "completed" : t.updatedAt ? "updated" : "created",
          text,
          owner,
        });
      };
      for (const completed of [false, true]) {
        let cursor: string | undefined;
        const seen = new Set<string>();
        for (let page = 0; page < 2; page++) {
          const args = { projectId, limit: 100, ...(cursor ? { cursor } : {}) };
          const result = completed
            ? await budget.read(() =>
                client.getCompletedTasksByCompletionDate({ ...args, since, until }),
              )
            : await budget.read(() => client.getTasks(args));
          const rows = "items" in result ? result.items : result.results;
          if (rows.length > 100) throw new Error("retro-page-limit");
          for (const task of rows) addTask(task);
          if (!result.nextCursor) break;
          if (seen.has(result.nextCursor)) throw new Error("retro-pagination");
          seen.add(result.nextCursor);
          cursor = result.nextCursor;
          if (page === 1) complete = false;
        }
      }
      const sorted = [...tasks.values()].sort((a, b) => {
        const latest = (t: Task) =>
          Math.max(
            t.updatedAt?.getTime() ?? 0,
            t.completedAt?.getTime() ?? 0,
            t.addedAt?.getTime() ?? 0,
          );
        return latest(b) - latest(a) || a.id.localeCompare(b.id);
      });
      const commentTasks = sorted.slice(0, 10);
      if (sorted.length > commentTasks.length) complete = false;
      for (const task of commentTasks) {
        let cursor: string | undefined;
        const seen = new Set<string>();
        for (let page = 0; page < 2; page++) {
          const result = await budget.read(() =>
            client.getComments({ taskId: task.id, limit: 50, ...(cursor ? { cursor } : {}) }),
          );
          if (result.results.length > 50) throw new Error("retro-comment-limit");
          for (const c of result.results) {
            if (c.taskId !== task.id || c.isDeleted) continue;
            const at = c.postedAt.toISOString();
            if (!within(at)) continue;
            if (c.fileAttachment) {
              attachments++;
              complete = false;
            }
            if (!c.content.trim()) continue;
            const owner = c.postedUid === task.userId;
            if (!owner) foreignAuthors++;
            const key = `comment:${c.id}`;
            entries.set(key, {
              key,
              taskId: task.id,
              at,
              basis: "comment",
              text: c.content,
              owner,
            });
          }
          if (!result.nextCursor) break;
          if (seen.has(result.nextCursor)) throw new Error("retro-comment-pagination");
          seen.add(result.nextCursor);
          cursor = result.nextCursor;
          if (page === 1) complete = false;
        }
      }
      const all = [...entries.values()].sort(
        (a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key),
      );
      const selected = all.slice(0, 10),
        omittedEntries = all.length - selected.length;
      return {
        entries: selected,
        complete: complete && !omittedEntries,
        scannedTasks: tasks.size,
        commentTasks: commentTasks.length,
        undated,
        omittedEntries,
        attachments,
        foreignAuthors,
      };
    },
  };
}
