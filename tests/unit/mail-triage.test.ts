import { afterEach, expect, it, vi } from "vitest";
import { MailBudget } from "../../src/application/mail-budget.js";
import type { TriageEvidenceReader } from "../../src/application/ports.js";
import { triageMail } from "../../src/application/triage-mail.js";
import { runMailTriage } from "../../src/cli-mail-triage.js";
import { triageResult, triageState } from "../../src/domain/mail-triage.js";
import { threadRead } from "../fixtures/mail.js";
import { triageResponse } from "../fixtures/triage.js";

const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function budget(signal?: AbortSignal) {
  const b = new MailBudget({}, signal);
  budgets.push(b);
  return b;
}
const options = { maxJobs: 5, model: "jev-1.13.0" as const };
const clock = { now: () => new Date("2026-10-19T00:00:00Z") };
const ready = () => ({ status: "ready" as const, evidence: threadRead().evidence, directions: [] });
it.each(["unknown", "fyi", "noise"] as const)(
  "keeps semantic %s as a valid outcome without inventing effects",
  (attention) => {
    const response = triageResponse();
    response.answers.attention.choice = attention;
    expect(triageResult(response, "jev-1.13.0").answers.attention.choice).toBe(attention);
  },
);
it.each([
  (r: ReturnType<typeof triageResponse>) => {
    r.answers.kind.confidence = Number.NaN;
  },
  (r: ReturnType<typeof triageResponse>) => {
    r.answers.attention.probabilities.action = 1.1;
  },
  (r: ReturnType<typeof triageResponse>) => {
    Reflect.set(r.answers.lifecycle, "choice", "complete-all-tasks");
  },
  (r: ReturnType<typeof triageResponse>) => {
    r.usage.input_tokens = -1;
  },
  (r: ReturnType<typeof triageResponse>) => {
    Reflect.set(r, "model", "jev-preview");
  },
  (r: ReturnType<typeof triageResponse>) => {
    Reflect.deleteProperty(r.answers, "attention");
  },
  (r: ReturnType<typeof triageResponse>) => {
    Reflect.set(r.answers, "arbitraryTool", "private-secret");
  },
  (r: ReturnType<typeof triageResponse>) => {
    Reflect.set(r.answers.kind.probabilities, "new-project", 0);
  },
])("rejects malformed network results without surfacing private diagnostics", (mutate) => {
  const response = triageResponse();
  mutate(response);
  expect(() => triageResult(response, "jev-1.13.0")).toThrow("invalid-result");
});
it("rejects partial and oversized evidence without truncation", () => {
  const evidence = threadRead().evidence;
  evidence.coverage.messageBodies = "partial";
  expect(() => triageState(evidence, [])).toThrow("invalid-evidence");
  evidence.coverage.messageBodies = "complete";
  const m = evidence.messages[0];
  if (!m) throw new Error("Missing fixture");
  m.body = { status: "complete", text: "x".repeat(32768) };
  expect(() => triageState(evidence, [])).toThrow("input-too-large");
  expect(m.body.text).toHaveLength(32768);
});
it("reports mixed results without private input or arbitrary errors and consumes no jobs", async () => {
  const reader: TriageEvidenceReader = {
    pending: vi.fn(async () => [
      ready(),
      { status: "missing-evidence" as const },
      ready(),
      ready(),
    ]),
  };
  const judge = vi
    .fn()
    .mockResolvedValueOnce(triageResponse())
    .mockRejectedValueOnce(new Error("private-secret email@example.com"))
    .mockResolvedValueOnce({ private: "body" });
  const report = await triageMail(options, { reader, triage: { judge }, clock, budget: budget() });
  expect(report).toMatchObject({
    selectedJobs: 4,
    judgedJobs: 1,
    databaseWrites: 0,
    jobsConsumed: 0,
    downstreamWrites: 0,
    exitCode: 1,
    usage: { input_tokens: 100, output_tokens: 10 },
  });
  expect(report.results.map((r) => (r.status === "failed" ? r.reason : "judged"))).toEqual([
    "judged",
    "missing-evidence",
    "provider-error",
    "invalid-result",
  ]);
  expect(JSON.stringify(report)).not.toMatch(/private|@|Boiler|t-boiler|fingerprint|Please send/);
  expect(reader.pending).toHaveBeenCalledWith(5);
});
it("cancellation during a request stops further calls and rejects late results", async () => {
  const controller = new AbortController();
  const judge = vi.fn(async () => {
    controller.abort();
    return triageResponse();
  });
  const report = await triageMail(options, {
    reader: { pending: async () => [ready(), ready()] },
    triage: { judge },
    clock,
    budget: budget(controller.signal),
  });
  expect(judge).toHaveBeenCalledTimes(1);
  expect(report).toMatchObject({ judgedJobs: 0, exitCode: 1 });
});
it("reports database failure and an empty selection honestly", async () => {
  const judge = vi.fn();
  const report = await triageMail(options, {
    reader: {
      pending: async () => {
        throw new Error("private-sql");
      },
    },
    triage: { judge },
    clock,
    budget: budget(),
  });
  expect(report).toMatchObject({ selectionFailure: true, exitCode: 1 });
  const empty = await triageMail(options, {
    reader: { pending: async () => [] },
    triage: { judge },
    clock,
    budget: budget(),
  });
  expect(empty).toMatchObject({ selectionFailure: false, selectedJobs: 0, exitCode: 0 });
  expect(judge).not.toHaveBeenCalled();
});
it("enforces the shared command deadline and stops before another sample", async () => {
  vi.useFakeTimers();
  try {
    const judge = vi.fn(async () => {
      await vi.advanceTimersByTimeAsync(120001);
      return triageResponse();
    });
    const report = await triageMail(options, {
      reader: { pending: async () => [ready(), ready()] },
      triage: { judge },
      clock,
      budget: budget(),
    });
    expect(report).toMatchObject({ judgedJobs: 0, exitCode: 1, results: [{ reason: "deadline" }] });
    expect(judge).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});
it("repeated previews close the pool and leave pending evidence available", async () => {
  const pending = vi.fn(async () => [ready()]);
  const close = vi.fn(async () => {});
  const judge = vi.fn(async () => triageResponse());
  const deps = {
    database: () => ({ reader: { pending }, close }),
    triage: () => ({ judge }),
    clock,
  };
  const env = { DB_URL: "postgresql://fake:fake@127.0.0.1:1/fake", JEV_API_KEY: "fake-key" };
  for (let i = 0; i < 2; i++)
    expect(await runMailTriage([], env, deps)).toMatchObject({
      judgedJobs: 1,
      jobsConsumed: 0,
      databaseWrites: 0,
      exitCode: 0,
    });
  expect(pending).toHaveBeenCalledTimes(2);
  expect(judge).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(2);
});
it("validates command options/configuration before effects and closes resources on adapter failure", async () => {
  const database = vi.fn();
  const triage = vi.fn();
  const env = { DB_URL: "postgresql://fake:fake@127.0.0.1:1/fake", JEV_API_KEY: "fake-key" };
  for (const args of [
    ["--max-jobs", "0"],
    ["--model", "private"],
    ["--max-jobs", "1", "--max-jobs", "2"],
    ["--unexpected", "private"],
  ])
    await expect(runMailTriage(args, env, { database, triage })).rejects.toThrow();
  await expect(runMailTriage([], {}, { database, triage })).rejects.toThrow();
  expect(database).not.toHaveBeenCalled();
  const close = vi.fn(async () => {});
  database.mockReturnValue({ reader: { pending: async () => [] }, close });
  triage.mockImplementation(() => {
    throw new Error("private-initialization");
  });
  await expect(runMailTriage([], env, { database, triage })).rejects.toThrow();
  expect(close).toHaveBeenCalledTimes(1);
});
