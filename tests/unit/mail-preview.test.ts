import { spawnSync } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import { MailBudget } from "../../src/application/mail-budget.js";
import type { MailReader } from "../../src/application/ports.js";
import { previewMail, previewReportText } from "../../src/application/preview-mail.js";
import { mailPreviewOptions, runMailPreview } from "../../src/cli-mail.js";
import { MailReadError } from "../../src/domain/mail-evidence.js";
import { mailInstant, threadRead } from "../fixtures/mail.js";

const budgets: MailBudget[] = [];
const makeBudget = (limits = {}) => {
  const budget = new MailBudget(limits);
  budgets.push(budget);
  return budget;
};
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
  vi.useRealTimers();
});
const options = { days: 30, maxThreads: 20 };
const clock = { now: () => mailInstant };
function reader(
  pages: Array<{ ids: string[]; nextToken?: string }> = [{ ids: ["t-boiler"] }],
): MailReader {
  let index = 0;
  return {
    listThreads: vi.fn(async () => pages[index++] ?? { ids: [] }),
    readThreadEvidence: vi.fn(async (id) => threadRead(id)),
  };
}
it("discovers every page with fixed boundaries and deduplicates threads", async () => {
  const mail = reader([{ ids: ["one"], nextToken: "next" }, { ids: ["one", "two"] }]);
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(mail.listThreads).toHaveBeenNthCalledWith(
    1,
    "after:1789127999 before:1791720000",
    undefined,
  );
  expect(mail.listThreads).toHaveBeenNthCalledWith(2, "after:1789127999 before:1791720000", "next");
  expect(mail.readThreadEvidence).toHaveBeenCalledTimes(2);
  expect(result.report).toMatchObject({
    discoveryComplete: true,
    eligibleThreads: 2,
    exitCode: 0,
    downstreamWrites: 0,
  });
  expect(result.records[0]?.evidence.messages[0]?.receivedAt).toBe("2026-08-20T16:00:00.000Z");
});
it.each([
  { pages: [{ ids: ["one", "two"] }], maxThreads: 2, complete: true, code: 0 },
  { pages: [{ ids: ["one", "two"], nextToken: "more" }], maxThreads: 2, complete: false, code: 2 },
  { pages: [{ ids: ["one", "two", "three"] }], maxThreads: 2, complete: false, code: 2 },
])(
  "reports exact exhaustion versus a limited sample ($code)",
  async ({ pages, maxThreads, complete, code }) => {
    const mail = reader(pages);
    const result = await previewMail(
      { days: 30, maxThreads },
      { mail, clock, budget: makeBudget() },
    );
    expect(result.report.discoveryComplete).toBe(complete);
    expect(result.report.exitCode).toBe(code);
    expect(mail.listThreads).toHaveBeenCalledTimes(1);
  },
);
it("stops stalled pagination instead of claiming completeness", async () => {
  const result = await previewMail(options, {
    mail: reader([
      { ids: ["one"], nextToken: "same" },
      { ids: ["one"], nextToken: "same" },
    ]),
    clock,
    budget: makeBudget(),
  });
  expect(result.report).toMatchObject({
    discoveredThreads: 1,
    discoveryComplete: false,
    reasons: ["pagination-stalled"],
    exitCode: 1,
  });
});
it("retains collected evidence after a later discovery page fails", async () => {
  const mail = reader([{ ids: ["one"], nextToken: "more" }]);
  vi.mocked(mail.listThreads)
    .mockImplementationOnce(async () => ({ ids: ["one"], nextToken: "more" }))
    .mockRejectedValueOnce(new Error("secret provider response"));
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(result.records).toHaveLength(1);
  expect(result.report).toMatchObject({
    discoveryComplete: false,
    bodyCoverageComplete: true,
    reasons: ["provider-error"],
    exitCode: 1,
  });
  expect(previewReportText(result)).not.toContain("secret");
});
it("keeps body coverage separate and refuses partial fingerprints", async () => {
  const mail = reader();
  const partial = threadRead();
  const message = partial.evidence.messages[0];
  if (message) message.body = { status: "unavailable" };
  partial.evidence.coverage.messageBodies = "partial";
  vi.mocked(mail.readThreadEvidence).mockResolvedValue(partial);
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(result.records[0]).not.toHaveProperty("fingerprint");
  expect(result.report).toMatchObject({
    discoveryComplete: true,
    bodyCoverageComplete: false,
    partialThreads: 1,
    exitCode: 1,
  });
});
it("skips conversations without recent non-draft evidence and succeeds on empty discovery", async () => {
  const mail = reader();
  const old = threadRead();
  old.evidence.messages.splice(1);
  vi.mocked(mail.readThreadEvidence).mockResolvedValue(old);
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(result.report).toMatchObject({
    skippedThreads: 1,
    eligibleThreads: 0,
    draftsExcluded: 1,
    exitCode: 0,
  });
  const empty = await previewMail(options, {
    mail: reader([{ ids: [] }]),
    clock,
    budget: makeBudget(),
  });
  expect(empty.report).toMatchObject({ discoveryComplete: true, eligibleThreads: 0, exitCode: 0 });
});
it("counts disappeared or malformed threads as failures", async () => {
  const mail = reader([{ ids: ["gone", "malformed"] }]);
  vi.mocked(mail.readThreadEvidence)
    .mockRejectedValueOnce(new MailReadError("missing-thread"))
    .mockRejectedValueOnce(new MailReadError("invalid-data"));
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(result.report).toMatchObject({
    failedThreads: 2,
    bodyCoverageComplete: false,
    reasons: ["invalid-data", "missing-thread"],
    exitCode: 1,
  });
});
it("bounds concurrent reads and wakes waiters after request-limit errors", async () => {
  const budget = makeBudget({ concurrency: 1, maxRequests: 2 });
  let active = 0,
    peak = 0;
  const operations = Array.from({ length: 5 }, () =>
    budget.read(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
    }),
  );
  const outcomes = await Promise.allSettled(operations);
  expect(peak).toBe(1);
  expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(2);
  expect(budget.requests).toBe(2);
});
it("deadline cancels outstanding and queued reads and prevents later requests", async () => {
  const budget = makeBudget({ deadlineMs: 15, concurrency: 1 });
  const pending = budget.read(
    () =>
      new Promise((_resolve, reject) => {
        budget.signal.addEventListener("abort", () => reject(budget.signal.reason), { once: true });
      }),
  );
  const queued = budget.read(async () => "must not start");
  const outcomes = await Promise.allSettled([pending, queued]);
  expect(outcomes.every((o) => o.status === "rejected")).toBe(true);
  expect(budget.requests).toBe(1);
  await expect(budget.read(async () => "never")).rejects.toThrow("deadline");
});
it("reports a cancelled run and launches no additional retrievals", async () => {
  const budget = makeBudget();
  const mail = reader([{ ids: ["one", "two", "three", "four"] }]);
  vi.mocked(mail.readThreadEvidence).mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1));
    throw new MailReadError("deadline");
  });
  // Exercise already-aborted external cancellation through the application.
  const controller = new AbortController();
  controller.abort();
  const cancelled = new MailBudget({}, controller.signal);
  budgets.push(cancelled);
  const result = await previewMail(options, { mail, clock, budget: cancelled });
  expect(result.report).toMatchObject({
    discoveryComplete: false,
    reasons: ["cancelled"],
    exitCode: 1,
  });
  expect(mail.readThreadEvidence).not.toHaveBeenCalled();
  budget.close();
});
it("validates CLI options before credentials or any provider initialization", async () => {
  expect(mailPreviewOptions([])).toEqual(options);
  expect(mailPreviewOptions(["--days", "1", "--max-threads", "500"])).toEqual({
    days: 1,
    maxThreads: 500,
  });
  const factory = vi.fn();
  for (const args of [
    ["--unknown", "secret"],
    ["--days"],
    ["--days", "0"],
    ["--days", "366"],
    ["--days", "1.5"],
    ["--max-threads", "501"],
    ["--days", "1", "--days", "2"],
    ["--days", "secret"],
  ]) {
    await expect(runMailPreview(args, {}, { reader: factory })).rejects.toThrow();
  }
  expect(factory).not.toHaveBeenCalled();
});
it("runs with Google credentials only and prints no internal evidence", async () => {
  const result = await runMailPreview(
    [],
    {
      GOOGLE_CLIENT_ID: "fake-client",
      GOOGLE_CLIENT_SECRET: "fake-secret",
      GOOGLE_REFRESH_TOKEN: "fake-refresh",
    },
    { reader: () => reader(), clock },
  );
  const output = previewReportText(result);
  for (const marker of [
    "example.com",
    "Boiler",
    "t-boiler",
    "m1",
    "fake-secret",
    "Please confirm",
    "fingerprint",
  ])
    expect(output).not.toContain(marker);
  expect(result.report.exitCode).toBe(0);
});
it("compiled command rejects invalid options offline without leaking values", () => {
  // Build is verified by the canonical gate; source CLI is exercised here without env files.
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./scripts/no-network.mjs",
      "src/cli.ts",
      "mail:preview",
      "--days",
      "private-marker",
    ],
    {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("--days");
  expect(result.stderr).not.toContain("private-marker");
  expect(result.stdout).toBe("");
});
it("does not hide partial coverage in a skipped old conversation", async () => {
  const mail = reader();
  const old = threadRead();
  old.evidence.messages.splice(1);
  const m = old.evidence.messages[0];
  if (m) m.body = { status: "too-large" };
  old.evidence.coverage.messageBodies = "partial";
  vi.mocked(mail.readThreadEvidence).mockResolvedValue(old);
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(result.report).toMatchObject({
    skippedThreads: 1,
    eligibleThreads: 0,
    partialThreads: 1,
    bodyCoverageComplete: false,
    exitCode: 1,
  });
});
it("an in-flight deadline stops subsequent conversation reads", async () => {
  const budget = makeBudget({ deadlineMs: 15, concurrency: 1 });
  const mail = reader([{ ids: ["one", "two", "three"] }]);
  vi.mocked(mail.readThreadEvidence).mockImplementation(() =>
    budget.read(
      () =>
        new Promise((_resolve, reject) => {
          budget.signal.addEventListener("abort", () => reject(budget.signal.reason), {
            once: true,
          });
        }),
    ),
  );
  const result = await previewMail(options, { mail, clock, budget });
  expect(mail.readThreadEvidence).toHaveBeenCalledTimes(1);
  expect(result.report).toMatchObject({
    discoveryComplete: true,
    failedThreads: 3,
    bodyCoverageComplete: false,
    reasons: ["deadline"],
    exitCode: 1,
  });
});

it("does not retrieve selected conversations after discovery is rate-limited", async () => {
  const mail = reader();
  vi.mocked(mail.listThreads)
    .mockResolvedValueOnce({ ids: ["selected"], nextToken: "more" })
    .mockRejectedValueOnce(new MailReadError("rate-limited"));
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(mail.readThreadEvidence).not.toHaveBeenCalled();
  expect(result.records).toEqual([]);
  expect(result.report).toMatchObject({
    discoveredThreads: 1,
    retrievedThreads: 0,
    failedThreads: 0,
    discoveryComplete: false,
    bodyCoverageComplete: false,
    reasons: ["rate-limited"],
    exitCode: 1,
  });
});

it("stops selecting on throttling and retains already-started successful evidence in order", async () => {
  const mail = reader([{ ids: ["slow-success", "throttled", "fast-success", "untouched"] }]);
  vi.mocked(mail.readThreadEvidence).mockImplementation(async (id) => {
    if (id === "throttled") throw new MailReadError("rate-limited");
    if (id === "slow-success") await new Promise<void>((resolve) => setImmediate(resolve));
    return threadRead(id);
  });
  const result = await previewMail(options, { mail, clock, budget: makeBudget() });
  expect(mail.readThreadEvidence).toHaveBeenCalledTimes(3);
  expect(result.records.map((r) => r.evidence.source.threadId)).toEqual([
    "slow-success",
    "fast-success",
  ]);
  expect(result.report).toMatchObject({
    discoveredThreads: 4,
    retrievedThreads: 2,
    failedThreads: 1,
    bodyCoverageComplete: false,
    reasons: ["rate-limited"],
    exitCode: 1,
  });
});
