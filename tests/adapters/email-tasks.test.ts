import { HttpResponse, http } from "msw";
import { expect, it } from "vitest";
import { jevEmailTasks } from "../../src/adapters/jev-email-tasks.js";
import { todoistEmailTasks } from "../../src/adapters/todoist-email-tasks.js";
import { taskQuestion } from "../../src/domain/email-task.js";
import {
  taskConversation,
  taskProjects,
  taskResponse,
  taskReview,
} from "../fixtures/email-task.js";
import { server } from "../setup.js";

it("sends finite action/project choices with full synthetic context to the pinned Jev model", async () => {
  server.use(
    http.post("https://api.typesafe.ai/v1/systemone", async ({ request }) => {
      const body = await request.json();
      expect(request.headers.get("authorization")).toBe("Bearer fake-key");
      expect(body).toMatchObject({
        model: "jev-1.13.0",
        questions: {
          eligibility: {
            criteria: {
              conditional: expect.stringContaining("unconfirmed"),
              none: expect.stringContaining("promotion"),
            },
          },
          action: {
            criteria: {
              a0: expect.stringContaining('"Please send two dates for the boiler inspection."'),
            },
          },
          project: { criteria: { p1: expect.stringContaining('"Home maintenance"') } },
        },
      });
      expect(body).toMatchObject({
        state: {
          actionCandidates: [
            { ref: "a0", text: "Please send two dates for the boiler inspection." },
          ],
        },
      });
      expect(JSON.stringify(body)).not.toContain("service@example.com");
      return HttpResponse.json(taskResponse());
    }),
  );
  const answer = await jevEmailTasks("fake-key")(
    taskQuestion(taskConversation(), taskProjects.slice(0, 2)),
    new AbortController().signal,
  );
  expect(answer).toMatchObject({ model: "jev-1.13.0", answers: { action: { choice: "a0" } } });
});
it("creates a task using the saved request ID, reviewed project and Gmail source marker", async () => {
  const candidate = taskReview().candidates[0];
  if (!candidate) throw new Error("fixture");
  server.use(
    http.post("https://api.todoist.com/api/v1/tasks", async ({ request }) => {
      expect(request.headers.get("X-Request-Id")).toBe("00000000-0000-4000-8000-000000000004");
      const body = (await request.json()) as Record<string, unknown>;
      expect(body).toMatchObject({ content: candidate.title, project_id: "home" });
      expect(body.description).toContain("https://mail.google.com/mail/u/0/#all/t-boiler");
      expect(body.description).toContain("reviewed-email-tasks/v1:");
      return HttpResponse.json({
        id: "task-1",
        user_id: "owner",
        project_id: "home",
        section_id: null,
        parent_id: null,
        added_by_uid: null,
        assigned_by_uid: null,
        responsible_uid: null,
        labels: [],
        deadline: null,
        duration: null,
        checked: false,
        is_deleted: false,
        added_at: null,
        completed_at: null,
        updated_at: null,
        due: null,
        priority: 1,
        child_order: 1,
        content: body.content,
        description: body.description,
        day_order: 1,
        is_collapsed: false,
      });
    }),
  );
  expect(
    await todoistEmailTasks("fake", new AbortController().signal).create(
      candidate,
      "00000000-0000-4000-8000-000000000004",
    ),
  ).toBe("task-1");
});
it("rejects an oversized complete request before sending source text", () => {
  const question = taskQuestion(taskConversation(), taskProjects.slice(0, 2));
  const message = question.state.messages[0];
  if (!message) throw new Error("fixture");
  message.text = "x".repeat(32_768);
  expect(() => jevEmailTasks("fake-key")(question, new AbortController().signal)).toThrow(
    "input-too-large",
  );
});
it("does not let the Todoist SDK automatically replay a create after a network error", async () => {
  let attempts = 0;
  server.use(
    http.post("https://api.todoist.com/api/v1/tasks", () => {
      attempts++;
      return HttpResponse.error();
    }),
  );
  const candidate = taskReview().candidates[0];
  if (!candidate) throw new Error("fixture");
  await expect(
    todoistEmailTasks("fake", new AbortController().signal).create(candidate, "request-fixture"),
  ).rejects.toThrow("Todoist transport unavailable");
  expect(attempts).toBe(1);
});
it("reads paginated live destinations and omits archived or frozen projects", async () => {
  const project = (id: string, extra = {}) => ({
    id,
    can_assign_tasks: false,
    child_order: 1,
    color: "blue",
    created_at: null,
    is_archived: false,
    is_deleted: false,
    is_favorite: false,
    is_frozen: false,
    name: id,
    updated_at: null,
    view_style: "list",
    default_order: 1,
    description: "",
    is_collapsed: false,
    is_shared: false,
    parent_id: null,
    inbox_project: id === "inbox",
    ...extra,
  });
  server.use(
    http.get("https://api.todoist.com/api/v1/projects", ({ request }) => {
      const cursor = new URL(request.url).searchParams.get("cursor");
      return HttpResponse.json(
        cursor
          ? {
              results: [project("home"), project("frozen", { is_frozen: true })],
              next_cursor: null,
            }
          : {
              results: [project("inbox"), project("archived", { is_archived: true })],
              next_cursor: "next",
            },
      );
    }),
  );
  expect(await todoistEmailTasks("fake", new AbortController().signal).projects()).toMatchObject([
    { id: "inbox", inbox: true },
    { id: "home" },
  ]);
});
