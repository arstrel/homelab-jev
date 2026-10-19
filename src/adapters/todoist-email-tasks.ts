import type { EmailTaskRemote } from "../application/email-tasks.js";
import { emailTaskKey, gmailLink, type TaskProject } from "../domain/email-task.js";
import { todoistClient } from "./todoist.js";

export function todoistEmailTasks(token: string, signal: AbortSignal): EmailTaskRemote {
  const client = todoistClient(token, signal);
  return {
    async projects() {
      const projects: TaskProject[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      for (let page = 0; page < 5; page++) {
        const response = await client.getProjects({ limit: 100, ...(cursor ? { cursor } : {}) });
        for (const p of response.results)
          if (!p.isArchived && !p.isDeleted && !p.isFrozen)
            projects.push({
              id: p.id,
              name: p.name,
              description: p.description.slice(0, 500),
              inbox: "inboxProject" in p && p.inboxProject,
            });
        if (!response.nextCursor) return projects;
        if (seen.has(response.nextCursor)) throw new Error("project-pagination");
        seen.add(response.nextCursor);
        cursor = response.nextCursor;
      }
      throw new Error("project-limit");
    },
    async create(candidate, requestId) {
      const task = await client.addTask(
        {
          content: candidate.title,
          projectId: candidate.projectId,
          description: `Source: [Gmail conversation](${gmailLink(candidate.sourceId)})\n\nJev reviewed email task. Marker: ${emailTaskKey(candidate.sourceId)}`,
        },
        requestId,
      );
      return task.id;
    },
  };
}
