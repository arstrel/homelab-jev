import { delay, HttpResponse, http } from "msw";
import { afterEach, expect, it } from "vitest";
import { gmailReader } from "../../src/adapters/gmail.js";
import { googleAuth } from "../../src/adapters/google.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { immediateGmailTiming } from "../fixtures/gmail-timing.js";
import { mailInstant } from "../fixtures/mail.js";
import { server } from "../setup.js";

const root = "https://gmail.googleapis.com/gmail/v1/users/me";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function setup(limits = {}) {
  const budget = new MailBudget(limits);
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  auth.setCredentials({ access_token: "fake", expiry_date: Date.now() + 10_000_000 });
  return gmailReader(auth, budget, { now: () => mailInstant }, immediateGmailTiming());
}
it("reads a string history anchor and deduplicates all change types across paginated transport", async () => {
  const anchor = "90071992547409930";
  server.use(
    http.get(`${root}/profile`, () => HttpResponse.json({ historyId: anchor })),
    http.get(`${root}/history`, ({ request }) => {
      const query = new URL(request.url).searchParams;
      expect(query.get("startHistoryId")).toBe(anchor);
      expect(query.get("maxResults")).toBe("100");
      expect(query.has("labelId")).toBe(false);
      if (query.get("pageToken") === "next")
        return HttpResponse.json({ historyId: "90071992547409940" });
      return HttpResponse.json({
        historyId: "90071992547409940",
        nextPageToken: "next",
        history: [
          {
            id: "90071992547409931",
            messages: [{ id: "m1", threadId: "incoming" }],
            messagesAdded: [
              { message: { id: "m1", threadId: "incoming" } },
              { message: { id: "m2", threadId: "sent" } },
            ],
            messagesDeleted: [{ message: { id: "m3", threadId: "removed" } }],
            labelsAdded: [{ message: { id: "m4", threadId: "read-state" }, labelIds: ["UNREAD"] }],
            labelsRemoved: [
              { message: { id: "m4", threadId: "read-state" }, labelIds: ["UNREAD"] },
            ],
          },
        ],
      });
    }),
  );
  const mail = setup();
  expect(await mail.currentHistoryId()).toBe(anchor);
  expect(await mail.listHistory(anchor, undefined)).toEqual({
    ids: ["incoming", "sent", "removed", "read-state"],
    historyId: "90071992547409940",
    nextToken: "next",
  });
  expect(await mail.listHistory(anchor, "next")).toEqual({
    ids: [],
    historyId: "90071992547409940",
  });
});
it("maps only history 404 to expired-anchor and preserves missing-thread distinction", async () => {
  server.use(
    http.get(
      `${root}/history`,
      () => new HttpResponse("private provider message", { status: 404 }),
    ),
    http.get(`${root}/profile`, () => HttpResponse.json({ emailAddress: "me@example.com" })),
    http.get(`${root}/threads/gone`, () => new HttpResponse(null, { status: 404 })),
  );
  const mail = setup();
  await expect(mail.listHistory("10", undefined)).rejects.toThrow(/^history-expired$/);
  await expect(mail.readThreadEvidence("gone")).rejects.toThrow(/^missing-thread$/);
});
it.each([
  {},
  { historyId: 20 },
  { historyId: "9" },
  { historyId: "20", history: [{ id: "11", messagesAdded: [{ message: { id: "m" } }] }] },
])("rejects malformed or regressing history without leaking source data", async (raw) => {
  server.use(http.get(`${root}/history`, () => HttpResponse.json(raw)));
  await expect(setup().listHistory("10", undefined)).rejects.toThrow(/^invalid-data$/);
});
it("bounds profile and history with the same request budget", async () => {
  server.use(http.get(`${root}/profile`, () => HttpResponse.json({ historyId: "10" })));
  const mail = setup({ maxRequests: 1 });
  expect(await mail.currentHistoryId()).toBe("10");
  await expect(mail.listHistory("10", undefined)).rejects.toThrow("request-limit");
});

it("cancels an in-flight history request at the shared deadline", async () => {
  server.use(
    http.get(`${root}/history`, async () => {
      await delay(100);
      return HttpResponse.json({ historyId: "20" });
    }),
  );
  await expect(setup({ deadlineMs: 15 }).listHistory("10", undefined)).rejects.toThrow("deadline");
});
