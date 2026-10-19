import { HttpResponse, http } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { type GmailTiming, gmailReader } from "../../src/adapters/gmail.js";
import { googleAuth } from "../../src/adapters/google.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { immediateGmailTiming } from "../fixtures/gmail-timing.js";
import { gmailThread, mailInstant } from "../fixtures/mail.js";
import { server } from "../setup.js";

const root = "https://gmail.googleapis.com/gmail/v1/users/me";
const budgets: MailBudget[] = [];
afterEach(() => {
  for (const budget of budgets.splice(0)) budget.close();
});
function setup(pacing?: GmailTiming, signal?: AbortSignal, deadlineMs = 120_000) {
  const budget = new MailBudget({ deadlineMs }, signal);
  budgets.push(budget);
  const auth = googleAuth({
    GOOGLE_CLIENT_ID: "fake",
    GOOGLE_CLIENT_SECRET: "fake",
    GOOGLE_REFRESH_TOKEN: "fake",
  });
  auth.setCredentials({ access_token: "fake", expiry_date: Date.now() + 10_000_000 });
  return { mail: gmailReader(auth, budget, { now: () => mailInstant }, pacing), budget, auth };
}
function controlledTiming() {
  let now = 0;
  const waits: Array<{ at: number; resolve(): void }> = [];
  return {
    now: () => now,
    wait: vi.fn(
      (milliseconds: number) =>
        new Promise<void>((resolve) => {
          waits.push({ at: now + milliseconds, resolve });
        }),
    ),
    advance(milliseconds: number) {
      now += milliseconds;
      for (const wait of waits.splice(0)) {
        if (wait.at <= now) wait.resolve();
        else waits.push(wait);
      }
    },
  };
}
const throttle = (status = 403, reason = "rateLimitExceeded") =>
  HttpResponse.json(
    { error: { message: "private provider text", errors: [{ reason }] } },
    { status },
  );
function storedTextThread() {
  const raw = gmailThread();
  return {
    ...raw,
    messages: raw.messages.map((message) =>
      message.id === "m2"
        ? {
            ...message,
            payload: { ...message.payload, body: { attachmentId: "body-text", size: 5 } },
          }
        : message,
    ),
  };
}

it("spaces concurrent profile/history/list request starts with one admission queue", async () => {
  const timing = controlledTiming();
  const starts: number[] = [];
  server.use(
    http.get(`${root}/*`, () => {
      starts.push(timing.now());
      return HttpResponse.json({ historyId: "20", emailAddress: "me@example.com" });
    }),
  );
  const { mail } = setup(timing);
  const pending = Promise.all([
    mail.currentHistoryId(),
    mail.listHistory("10", undefined),
    mail.listThreads("after:1", undefined),
  ]);
  await vi.waitFor(() => expect(starts).toEqual([0]));
  timing.advance(1_499);
  expect(starts).toEqual([0]);
  timing.advance(1);
  await vi.waitFor(() => expect(starts).toEqual([0, 1_500]));
  timing.advance(1_500);
  await pending;
  expect(starts).toEqual([0, 1_500, 3_000]);
});

it("paces full conversations and separately stored text through the same queue", async () => {
  const timing = immediateGmailTiming();
  const starts: Array<[string, number]> = [];
  const raw = storedTextThread();
  server.use(
    http.get(`${root}/*`, ({ request }) => {
      const path = new URL(request.url).pathname.split("/me/")[1] ?? "";
      starts.push([path, timing.now()]);
      if (path === "profile") return HttpResponse.json({ emailAddress: "me@example.com" });
      if (path.startsWith("messages/")) return HttpResponse.json({ size: 5, data: "SGVsbG8" });
      return HttpResponse.json(raw);
    }),
  );
  const { mail } = setup(timing);
  const read = await mail.readThreadEvidence("t-boiler");
  expect(read.evidence.coverage.messageBodies).toBe("complete");
  expect(starts).toEqual([
    ["profile", 0],
    ["threads/t-boiler", 1_500],
    ["messages/m2/attachments/body-text", 3_000],
  ]);
});

it.each([
  [429, "arbitrary"],
  [403, "rateLimitExceeded"],
  [403, "userRateLimitExceeded"],
])(
  "recognizes %i/%s and latches all later reads without SDK retries or raw text",
  async (status, reason) => {
    const calls = vi.fn(() => throttle(status, reason));
    server.use(http.get(`${root}/history`, calls));
    const { mail, budget } = setup(immediateGmailTiming());
    await expect(mail.listHistory("10", undefined)).rejects.toThrow(/^rate-limited$/);
    await expect(mail.currentHistoryId()).rejects.toThrow(/^rate-limited$/);
    await expect(mail.listThreads("after:1", undefined)).rejects.toThrow(/^rate-limited$/);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(budget.signal.aborted).toBe(false);
  },
);

it.each([
  "insufficientPermissions",
  "dailyLimitExceeded",
  "unrecognized",
  "private rateLimitExceeded text",
])("keeps other 403 reasons ordinary and permits later requests (%s)", async (reason) => {
  const calls = vi.fn(() => throttle(403, reason));
  server.use(http.get(`${root}/history`, calls));
  const { mail } = setup(immediateGmailTiming());
  await expect(mail.listHistory("10", undefined)).rejects.toThrow(/^provider-error$/);
  await expect(mail.listHistory("10", undefined)).rejects.toThrow(/^provider-error$/);
  expect(calls).toHaveBeenCalledTimes(2);
});

it("prevents a waiting request from dispatching after another request is throttled", async () => {
  const timing = controlledTiming();
  const calls = vi.fn(() => throttle());
  server.use(http.get(`${root}/history`, calls));
  const { mail } = setup(timing);
  const pending = Promise.allSettled([
    mail.listHistory("10", undefined),
    mail.listHistory("10", undefined),
    mail.listHistory("10", undefined),
  ]);
  await vi.waitFor(() => expect(calls).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(timing.wait).toHaveBeenCalled());
  timing.advance(1_500);
  const outcomes = await pending;
  expect(
    outcomes.every((o) => o.status === "rejected" && o.reason.message === "rate-limited"),
  ).toBe(true);
  expect(calls).toHaveBeenCalledTimes(1);
});

it.each(["deadline", "cancelled"] as const)(
  "cancels production pacing on %s before another wire request",
  async (reason) => {
    const controller = new AbortController();
    const profile = vi.fn(() => HttpResponse.json({ historyId: "20" }));
    const history = vi.fn(() => HttpResponse.json({ historyId: "20" }));
    server.use(http.get(`${root}/profile`, profile), http.get(`${root}/history`, history));
    const { mail } = setup(undefined, controller.signal, reason === "deadline" ? 500 : 120_000);
    await mail.currentHistoryId();
    const pending = mail.listHistory("10", undefined);
    if (reason === "cancelled") {
      await new Promise<void>((resolve) => setImmediate(resolve));
      controller.abort();
    }
    await expect(pending).rejects.toThrow(reason);
    expect(history).not.toHaveBeenCalled();
  },
);

it("propagates body-part throttling instead of converting it into partial coverage", async () => {
  const raw = storedTextThread();
  const reads = vi.fn();
  server.use(
    http.get(`${root}/profile`, () => HttpResponse.json({ emailAddress: "me@example.com" })),
    http.get(`${root}/threads/t-boiler`, () => HttpResponse.json(raw)),
    http.get(`${root}/messages/m2/attachments/body-text`, () => {
      reads();
      return throttle();
    }),
  );
  const { mail } = setup(immediateGmailTiming());
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow(/^rate-limited$/);
  await expect(mail.readThreadEvidence("t-boiler")).rejects.toThrow(/^rate-limited$/);
  expect(reads).toHaveBeenCalledTimes(1);
});

it("does not bunch concurrent wire requests after a slow shared token refresh", async () => {
  const timing = controlledTiming();
  const starts: number[] = [];
  let release = () => {};
  const refreshed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const refresh = vi.fn(async () => {
    await refreshed;
    return HttpResponse.json({ access_token: "fake", expires_in: 3600 });
  });
  server.use(
    http.post("https://oauth2.googleapis.com/token", refresh),
    http.get(`${root}/*`, () => {
      starts.push(timing.now());
      return HttpResponse.json({ historyId: "20" });
    }),
  );
  const { mail, auth } = setup(timing);
  auth.setCredentials({ refresh_token: "fake" });
  const pending = Promise.all([
    mail.currentHistoryId(),
    mail.listHistory("10", undefined),
    mail.listThreads("after:1", undefined),
  ]);
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  timing.advance(3_000);
  await new Promise<void>((resolve) => setImmediate(resolve));
  expect(starts).toEqual([]);
  release();
  await vi.waitFor(() => expect(starts).toEqual([3_000]));
  timing.advance(1_500);
  await vi.waitFor(() => expect(starts).toEqual([3_000, 4_500]));
  timing.advance(1_500);
  await pending;
  expect(starts).toEqual([3_000, 4_500, 6_000]);
});
