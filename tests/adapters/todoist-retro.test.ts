import { HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import { todoistRetro } from "../../src/adapters/todoist-retro.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { retroInstant, todoistComment } from "../fixtures/retro.js";
import { todoistTask } from "../fixtures/todoist.js";
import { server } from "../setup.js";

const root = "https://api.todoist.com/api/v1",
  since = "2026-10-15T13:00:00.000Z";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function reader() {
  const b = new MailBudget();
  budgets.push(b);
  return todoistRetro("fake", b);
}
function task(id = "retro-1", extra = {}) {
  return todoistTask(id, {
    project_id: "retro",
    added_by_uid: "owner",
    due: null,
    added_at: retroInstant,
    updated_at: retroInstant,
    description: "",
    ...extra,
  });
}
it("reads completed Retro entries and recent comments on older scanned tasks without writes", async () => {
  server.use(
    http.get(`${root}/tasks`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("project_id")).toBe("retro");
      return HttpResponse.json({
        results: [
          task("old", { added_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }),
        ],
        next_cursor: null,
      });
    }),
    http.get(`${root}/tasks/completed/by_completion_date`, ({ request }) => {
      const q = new URL(request.url).searchParams;
      expect(q.get("since")).toBe(since);
      expect(q.get("until")).toBe(retroInstant);
      return HttpResponse.json({
        items: [
          task("retro-1", { checked: true, completed_at: retroInstant }),
          task("foreign", { project_id: "other" }),
          task("future", { completed_at: "2026-12-01T00:00:00Z" }),
        ],
        next_cursor: null,
      });
    }),
    http.get(`${root}/comments`, ({ request }) =>
      HttpResponse.json({
        results:
          new URL(request.url).searchParams.get("task_id") === "old"
            ? [
                todoistComment("recent", { item_id: "old" }),
                todoistComment("foreign-comment", { item_id: "unrelated" }),
                todoistComment("deleted", { item_id: "old", is_deleted: true }),
              ]
            : [],
        next_cursor: null,
      }),
    ),
  );
  const result = await reader().read("retro", since, retroInstant);
  expect(result.entries.map((e) => e.basis).sort()).toEqual(["comment", "completed"]);
  expect(result.entries.every((e) => e.owner)).toBe(true);
  expect(result.complete).toBe(true);
});
it("preserves distinct recurring completion occurrences and deduplicates their shared comments", async () => {
  server.use(
    http.get(`${root}/tasks`, () => HttpResponse.json({ results: [], next_cursor: null })),
    http.get(`${root}/tasks/completed/by_completion_date`, () =>
      HttpResponse.json({
        items: [
          task("retro-1", { completed_at: retroInstant }),
          task("retro-1", { completed_at: "2026-10-21T00:00:00Z" }),
        ],
        next_cursor: null,
      }),
    ),
    http.get(`${root}/comments`, () =>
      HttpResponse.json({ results: [todoistComment()], next_cursor: null }),
    ),
  );
  const result = await reader().read("retro", since, retroInstant);
  expect(result.entries).toHaveLength(3);
  expect(result.scannedTasks).toBe(1);
  expect(result.commentTasks).toBe(1);
});
it("reports scan/entry caps, undated source and unread attachments explicitly", async () => {
  server.use(
    http.get(`${root}/tasks`, () =>
      HttpResponse.json({
        results: [
          task("undated", { added_at: null, updated_at: null }),
          ...Array.from({ length: 12 }, (_, i) => task(String(i))),
        ],
        next_cursor: null,
      }),
    ),
    http.get(`${root}/tasks/completed/by_completion_date`, () =>
      HttpResponse.json({ items: [], next_cursor: null }),
    ),
    http.get(`${root}/comments`, ({ request }) =>
      HttpResponse.json({
        results: [
          todoistComment("attached", {
            item_id: new URL(request.url).searchParams.get("task_id"),
            file_attachment: { resource_type: "file", file_url: "https://private.invalid/file" },
          }),
        ],
        next_cursor: null,
      }),
    ),
  );
  const result = await reader().read("retro", since, retroInstant);
  expect(result.complete).toBe(false);
  expect(result.entries).toHaveLength(10);
  expect(result.commentTasks).toBe(10);
  expect(result.undated).toBe(1);
  expect(result.attachments).toBe(10);
  expect(result.omittedEntries).toBeGreaterThan(0);
});
it("rejects stalled cursors and a failed later read rather than returning a successful prefix", async () => {
  server.use(
    http.get(`${root}/tasks`, () => HttpResponse.json({ results: [task()], next_cursor: "same" })),
  );
  await expect(reader().read("retro", since, retroInstant)).rejects.toThrow("retro-pagination");
  server.use(
    http.get(`${root}/tasks`, () => HttpResponse.json({ results: [task()], next_cursor: null })),
    http.get(`${root}/tasks/completed/by_completion_date`, () =>
      HttpResponse.json({ error: "private" }, { status: 403 }),
    ),
  );
  await expect(reader().read("retro", since, retroInstant)).rejects.toThrow();
});
it("stops task and comment pagination at their two-page limits", async () => {
  let pages = 0,
    comments = 0;
  server.use(
    http.get(`${root}/tasks`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("limit")).toBe("100");
      pages++;
      return HttpResponse.json({ results: [task()], next_cursor: `tasks-${pages}` });
    }),
    http.get(`${root}/tasks/completed/by_completion_date`, () =>
      HttpResponse.json({ items: [], next_cursor: null }),
    ),
    http.get(`${root}/comments`, ({ request }) => {
      expect(new URL(request.url).searchParams.get("limit")).toBe("50");
      comments++;
      return HttpResponse.json({
        results: [todoistComment(String(comments))],
        next_cursor: `comments-${comments}`,
      });
    }),
  );
  const result = await reader().read("retro", since, retroInstant);
  expect(pages).toBe(2);
  expect(comments).toBe(2);
  expect(result.complete).toBe(false);
});
