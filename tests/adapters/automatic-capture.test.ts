import { HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import { jevCapture } from "../../src/adapters/jev-capture.js";
import { todoistCapture } from "../../src/adapters/todoist-capture.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { captureQuestion } from "../../src/domain/automatic-capture.js";
import { taskConversation, taskProjects, taskResponse } from "../fixtures/email-task.js";
import { todoistProject, todoistTask } from "../fixtures/todoist.js";
import { server } from "../setup.js";

const root = "https://api.todoist.com/api/v1",
  now = new Date("2026-10-11T12:00:00Z");
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function reader() {
  const budget = new MailBudget();
  budgets.push(budget);
  return todoistCapture("fake", budget, "retro");
}
function providers() {
  server.use(
    http.get(`${root}/projects`, () =>
      HttpResponse.json({
        results: [
          todoistProject("inbox", { inbox_project: true }),
          todoistProject(),
          todoistProject("retro", { name: "My renamed feedback" }),
        ],
        next_cursor: null,
      }),
    ),
    http.get(`${root}/tasks`, () =>
      HttpResponse.json({
        results: [
          todoistTask("manual-edited", {
            description: "https://mail.google.com/mail/u/0/#all/thread-1",
          }),
          todoistTask("feedback", { project_id: "retro" }),
        ],
        next_cursor: null,
      }),
    ),
    http.get(`${root}/tasks/completed/by_completion_date`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      expect(q.get("since")).toBe("2026-09-11T12:00:00.000Z");
      return HttpResponse.json({
        items: [
          todoistTask("done", {
            checked: true,
            completed_at: "2026-10-10T12:00:00Z",
            project_id: "archived",
          }),
        ],
        next_cursor: null,
      });
    }),
  );
}
it("reads current tasks and bounded completed work, preserves unknown-project matches and excludes configured Retro", async () => {
  providers();
  const inventory = await reader().inventory(now);
  expect(inventory.projects.map((p) => p.id)).toEqual(["inbox", "home"]);
  expect(inventory.tasks).toMatchObject([
    { id: "manual-edited", completed: false, sourceIds: ["thread-1"] },
    { id: "done", completed: true, projectId: "archived" },
  ]);
});
it("fails closed when task pagination remains incomplete", async () => {
  providers();
  server.use(
    http.get(`${root}/tasks`, () => HttpResponse.json({ results: [], next_cursor: "repeat" })),
  );
  await expect(reader().inventory(now)).rejects.toThrow("task-pagination");
});
it("sends finite existing-task choices and titles without provider IDs or descriptions", async () => {
  const q = captureQuestion(taskConversation(), {
    projects: taskProjects.slice(0, 2),
    tasks: [
      {
        id: "private-task-id",
        projectId: "home",
        title: "Arrange dates",
        completed: true,
        sourceIds: [],
      },
    ],
  });
  server.use(
    http.post("https://api.typesafe.ai/v1/systemone", async ({ request }) => {
      const body = await request.json();
      expect(body).toMatchObject({
        model: "jev-1.13.0",
        state: { existingTasks: [{ ref: "t0", title: "Arrange dates", completed: true }] },
        questions: {
          existing: {
            criteria: {
              none: expect.any(String),
              unknown: expect.any(String),
              t0: expect.stringContaining("Arrange dates"),
            },
          },
        },
      });
      expect(JSON.stringify(body)).not.toContain("private-task-id");
      return HttpResponse.json({
        ...taskResponse(),
        answers: {
          ...taskResponse().answers,
          existing: { type: "choice", choice: "none", confidence: 1, probabilities: { none: 1 } },
        },
      });
    }),
  );
  expect(await jevCapture("fake")(q, new AbortController().signal)).toMatchObject({
    answers: { existing: { choice: "none" } },
  });
});
