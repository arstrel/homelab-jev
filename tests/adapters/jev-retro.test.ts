import { HttpResponse, http } from "msw";
import { expect, it } from "vitest";
import { jevRetro } from "../../src/adapters/jev-retro.js";
import { kindRequest, matchRequest, retroResult } from "../../src/domain/retro-review.js";
import { retroEntry, retroResponse, retroTasks } from "../fixtures/retro.js";
import { server } from "../setup.js";

it("sends finite evidence/task choices without dedicated source IDs and validates the returned pinned model", async () => {
  const request = matchRequest(retroEntry(), retroTasks());
  server.use(
    http.post("https://api.typesafe.ai/v1/systemone", async ({ request: wire }) => {
      const body = await wire.json();
      expect(body).toMatchObject({
        model: "jev-1.13.0",
        questions: {
          task: { type: "choice" },
          relation: { criteria: { completion: expect.any(String) } },
        },
      });
      expect(JSON.stringify(body)).not.toMatch(/retro-1|task:retro/);
      return HttpResponse.json(
        retroResponse(request, { task: "t0", relation: "completion", evidence: "e0" }),
      );
    }),
  );
  expect(
    retroResult(await jevRetro("fake")(request, new AbortController().signal), request).answers.task
      ?.choice,
  ).toBe("t0");
});
it("does not retry provider errors or send an oversized request", async () => {
  let calls = 0;
  server.use(
    http.post("https://api.typesafe.ai/v1/systemone", () => {
      calls++;
      return HttpResponse.json({ error: "private" }, { status: 429 });
    }),
  );
  await expect(
    jevRetro("fake")(kindRequest(retroTasks()), new AbortController().signal),
  ).rejects.toThrow();
  expect(calls).toBe(1);
  await expect(
    jevRetro("fake")(
      matchRequest(retroEntry("x".repeat(32768)), retroTasks()),
      new AbortController().signal,
    ),
  ).rejects.toThrow("input-too-large");
  expect(calls).toBe(1);
});
