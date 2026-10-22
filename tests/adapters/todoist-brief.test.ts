import { HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import { todoistBrief } from "../../src/adapters/todoist-brief.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { todoistProject, todoistTask } from "../fixtures/todoist.js";
import { server } from "../setup.js";

const root = "https://api.todoist.com/api/v1";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function reader(retro?: string) {
  const budget = new MailBudget({ maxRequests: 7 });
  budgets.push(budget);
  return { read: todoistBrief("fake-token", budget, retro).read, budget };
}
it("reads paginated projects/tasks, preserves due values and omits Retro, closed and duplicate tasks", async () => {
  server.use(
    http.get(`${root}/projects`, ({ request }) => {
      expect(request.headers.get("authorization")).toBe("Bearer fake-token");
      const q = new URL(request.url).searchParams;
      expect(q.get("limit")).toBe("100");
      return HttpResponse.json(
        q.get("cursor")
          ? {
              results: [
                todoistProject("renamed-retro", { name: "My feedback" }),
                todoistProject("archived", { is_archived: true }),
              ],
              next_cursor: null,
            }
          : {
              results: [todoistProject(), todoistProject("retro", { name: " ReTrO " })],
              next_cursor: "projects-2",
            },
      );
    }),
    http.get(`${root}/tasks`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      expect(q.get("limit")).toBe("100");
      return HttpResponse.json(
        q.get("cursor")
          ? {
              results: [
                todoistTask(),
                todoistTask("complete", { checked: true }),
                todoistTask("deleted", { is_deleted: true }),
                todoistTask("orphan", { project_id: "missing" }),
              ],
              next_cursor: null,
            }
          : {
              results: [
                todoistTask(),
                todoistTask("feedback", { project_id: "retro" }),
                todoistTask("feedback2", { project_id: "renamed-retro" }),
              ],
              next_cursor: "tasks-2",
            },
      );
    }),
  );
  const { read, budget } = reader("renamed-retro");
  expect(await read()).toEqual({
    projects: [{ id: "home", name: "Home & Admin" }],
    tasks: [
      {
        id: "task-1",
        projectId: "home",
        content: "Arrange boiler inspection",
        due: { date: "2026-10-16" },
        sourceIds: ["t-boiler"],
      },
    ],
    projectsComplete: true,
    tasksComplete: true,
    unknownProjects: 1,
    retroExcluded: 2,
  });
  expect(budget.requests).toBe(4);
});
it("refreshes actual task responses without a saved inventory or description leakage", async () => {
  let changed = false;
  server.use(
    http.get(`${root}/projects`, () =>
      HttpResponse.json({
        results: [todoistProject(), todoistProject("personal")],
        next_cursor: null,
      }),
    ),
    http.get(`${root}/tasks`, () =>
      HttpResponse.json({
        results: [
          todoistTask(
            "task-1",
            changed
              ? {
                  content: "Book inspection",
                  project_id: "personal",
                  due: null,
                  description: "private unrelated text",
                }
              : {},
          ),
        ],
        next_cursor: null,
      }),
    ),
  );
  const { read } = reader();
  expect((await read()).tasks[0]?.sourceIds).toEqual(["t-boiler"]);
  changed = true;
  const inventory = await read();
  expect(inventory.tasks[0]).toMatchObject({
    projectId: "personal",
    content: "Book inspection",
    due: null,
    sourceIds: [],
  });
  expect(JSON.stringify(inventory)).not.toContain("private unrelated text");
});
it("caps project/task pages and reports incomplete coverage", async () => {
  let projects = 0,
    tasks = 0;
  server.use(
    http.get(`${root}/projects`, () =>
      HttpResponse.json({ results: [todoistProject()], next_cursor: `p${++projects}` }),
    ),
    http.get(`${root}/tasks`, () =>
      HttpResponse.json({ results: [todoistTask(String(++tasks))], next_cursor: `t${tasks}` }),
    ),
  );
  const { read, budget } = reader();
  expect(await read()).toMatchObject({ projectsComplete: false, tasksComplete: false });
  expect(projects).toBe(5);
  expect(tasks).toBe(2);
  expect(budget.requests).toBe(7);
});
it("rejects a stalled cursor and does not retry transport failures", async () => {
  let attempts = 0;
  server.use(
    http.get(`${root}/projects`, () => {
      attempts++;
      return HttpResponse.json({ results: [todoistProject()], next_cursor: "same" });
    }),
  );
  await expect(reader().read()).rejects.toThrow("project-pagination");
  expect(attempts).toBe(2);
  attempts = 0;
  server.use(
    http.get(`${root}/projects`, () => {
      attempts++;
      return HttpResponse.error();
    }),
  );
  await expect(reader().read()).rejects.toThrow("Todoist transport unavailable");
  expect(attempts).toBe(1);
});
it("rejects a failed later page or malformed response instead of returning a complete prefix", async () => {
  server.use(
    http.get(`${root}/projects`, () =>
      HttpResponse.json({ results: [todoistProject()], next_cursor: null }),
    ),
    http.get(`${root}/tasks`, ({ request }) =>
      new URL(request.url).searchParams.has("cursor")
        ? HttpResponse.json({ error: "private-failure" }, { status: 403 })
        : HttpResponse.json({ results: [todoistTask()], next_cursor: "next" }),
    ),
  );
  await expect(reader().read()).rejects.toThrow();
  server.use(
    http.get(`${root}/tasks`, () =>
      HttpResponse.json({ results: [{ id: "invalid" }], next_cursor: null }),
    ),
  );
  await expect(reader().read()).rejects.toThrow();
});
