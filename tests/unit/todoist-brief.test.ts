import { expect, it } from "vitest";
import {
  explicitGmailSources,
  renderTodoistContext,
  todoistTaskLink,
} from "../../src/domain/todoist-brief.js";
import { briefTime, todoistInventory } from "../fixtures/email-brief.js";

it("associates only exact supported primary-account permalinks", () => {
  const description = `Source: [Gmail](https://mail.google.com/mail/u/0/#all/t-boiler)
https://mail.google.com/mail/u/0/#inbox/t-boiler
https://mail.google.com/mail/u/0/#sent/encoded%2Did
https://mail.google.com.evil/mail/u/0/#all/no
https://mail.google.com/mail/u/1/#all/no
https://mail.google.com/mail/u/0/?q=bad#all/no
https://mail.google.com/mail/u/0/#search/topic/no
https://user:password@mail.google.com/mail/u/0/#all/no
https://mail.google.com/mail/u/0/#all/%ZZ
bare-id; Arrange boiler inspection`;
  expect(explicitGmailSources(description)).toEqual(["t-boiler", "encoded-id"]);
  expect(explicitGmailSources("Arrange boiler inspection t-boiler")).toEqual([]);
});
it("copies due values and escaped source titles without inventing dates or markup", () => {
  const inventory = todoistInventory();
  const task = inventory.tasks[0];
  const project = inventory.projects[0];
  if (!task || !project) throw new Error("fixture");
  project.name = "[Home](https://bad)\n# heading";
  task.content = "[click](https://bad) <script>\n# instruction";
  task.due = {
    date: "2026-10-16",
    datetime: "2026-10-16T18:00:00Z",
    timezone: "America/Los_Angeles",
  };
  const section = renderTodoistContext({
    ...inventory,
    state: "available",
    startedAt: briefTime,
    readAt: briefTime,
  });
  expect(section.markdown).toContain("date: 2026\\-10\\-16");
  expect(section.markdown).toContain("timezone: America/Los\\_Angeles");
  expect(section.markdown).not.toContain("\n# instruction");
  expect(section.markdown).toContain("\\[click\\]");
  expect(section.markdown).toContain("not inferred obligations");
  expect(todoistTaskLink("id) [bad]")).not.toContain(")");
});
it("bounds displayed context and explicitly reports omitted and incomplete work", () => {
  const inventory = todoistInventory();
  inventory.tasks = Array.from({ length: 200 }, (_, i) => ({
    id: String(i),
    projectId: "home",
    content: "長".repeat(300),
    due: null,
    sourceIds: [],
  }));
  const section = renderTodoistContext({
    ...inventory,
    state: "available",
    startedAt: briefTime,
    readAt: briefTime,
  });
  expect(Buffer.byteLength(section.markdown)).toBeLessThan(24576);
  expect(section.omitted).toBeGreaterThan(0);
  expect(section.complete).toBe(false);
  expect(section.markdown).toContain("Todoist coverage: INCOMPLETE");
  expect(section.tasks.length + section.omitted).toBe(200);
});
