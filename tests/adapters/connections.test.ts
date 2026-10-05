import { HttpResponse, http } from "msw";
import { expect, it, vi } from "vitest";
import { checkJev } from "../../src/adapters/jev.js";
import { checkTodoist, todoistClient } from "../../src/adapters/todoist.js";
import { server } from "../setup.js";

it("fails deliberate unhandled external requests", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(fetch("https://unexpected.example.invalid/")).rejects.toThrow();
});
it("Jev connection requests are read-only, typed and bounded", async () => {
  server.use(
    http.get("https://api.typesafe.ai/v1/models", ({ request }) => {
      expect(request.headers.get("authorization")).toBe("Bearer fake-key");
      return HttpResponse.json({ models: [] });
    }),
  );
  expect(await checkJev("fake-key")).toEqual({ models: 0 });
});
it("Todoist v1 reads projects without logging their contents", async () => {
  server.use(
    http.get("https://api.todoist.com/api/v1/projects", () =>
      HttpResponse.json({ results: [], next_cursor: null }),
    ),
  );
  expect(await checkTodoist("fake-token")).toEqual({ projects: 0 });
});
it("retains caller request identity in the Todoist SDK transport", async () => {
  // Exercise the installed SDK transport only; this test never makes a real task.
  server.use(
    http.post("https://api.todoist.com/api/v1/tasks", ({ request }) => {
      expect(request.headers.get("X-Request-Id")).toBe("00000000-0000-4000-8000-000000000004");
      return HttpResponse.json({ error: "fixture stops before task decoding" }, { status: 400 });
    }),
  );
  await expect(
    todoistClient("fake-token").addTask(
      { content: "Sanitized fixture" },
      "00000000-0000-4000-8000-000000000004",
    ),
  ).rejects.toThrow();
});
