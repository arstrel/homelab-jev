import { expect, it, vi } from "vitest";
import {
  type BriefDrive,
  type BriefRecord,
  type BriefSession,
  publishEmailBrief,
} from "../../src/application/email-brief.js";
import { briefOptions } from "../../src/cli-email-brief.js";
import {
  briefGroup,
  briefInputHash,
  briefPolicy,
  renderEmailBrief,
} from "../../src/domain/email-brief.js";
import type { RetroRequest } from "../../src/domain/retro-review.js";
import {
  briefFile,
  briefGeneration,
  briefRecord,
  briefStatus,
  briefTime,
  todoistInventory,
} from "../fixtures/email-brief.js";
import { retroEntry, retroRead, retroResponse } from "../fixtures/retro.js";
import { triageResponse } from "../fixtures/triage.js";

const options = { maxConversations: 10, days: 7, maxNew: 10 };
function setup(records: BriefRecord[] = [briefRecord()]) {
  const session: BriefSession = {
    sample: vi.fn(async () => ({ eligible: 12, records })),
    save: vi.fn(async (record, saved) => {
      record.saved = saved;
    }),
    destination: vi.fn(async () => ({ fileId: briefFile, lastPublished: null })),
    reserve: vi.fn(async (fileId) => ({ fileId, lastPublished: null })),
    publishing: vi.fn(async () => {}),
    published: vi.fn(async () => {}),
  };
  const judge = vi.fn(async () => triageResponse());
  const write = vi.fn<BriefDrive["write"]>(async () => {});
  const allocate = vi.fn(async () => briefFile);
  const read = vi.fn(async () => todoistInventory());
  const readRetro = vi.fn(async () => retroRead());
  const retroJudge = vi.fn(async (request: RetroRequest) => retroResponse(request));
  const signal = new AbortController();
  const deps = {
    database: {
      exclusive: async <T>(run: (s: BriefSession, signal: AbortSignal) => Promise<T>) =>
        run(session, signal.signal),
    },
    status: { read: async () => briefStatus() },
    triage: { judge },
    drive: () => ({ write, allocate }),
    todoist: () => ({ read }),
    retro: () => ({ read: readRetro }),
    retroJudge,
    clock: { now: () => new Date(briefTime), id: () => briefGeneration },
    signal: signal.signal,
  };
  return { session, judge, write, allocate, read, readRetro, retroJudge, signal, deps };
}
it("publishes Retro context without additional inference unless explicitly requested", async () => {
  const s = setup([]);
  s.readRetro.mockResolvedValue(retroRead([retroEntry()]));
  expect(await publishEmailBrief({ ...options, maxNew: 0 }, s.deps)).toMatchObject({
    published: true,
    newRequests: 0,
    retro: { state: "available", entries: 1, reviewRequested: false },
  });
  expect(s.retroJudge).not.toHaveBeenCalled();
  expect(s.write.mock.calls[0]?.[2]).toContain("Interpretation not requested");
});
it("shares one inference cap across email and Retro and reports bounded review gaps", async () => {
  const s = setup();
  s.readRetro.mockResolvedValue(retroRead([retroEntry()]));
  const result = await publishEmailBrief({ ...options, maxNew: 2, retroReview: true }, s.deps);
  expect(result).toMatchObject({
    newRequests: 2,
    classified: 1,
    retro: { newRequests: 1, reviewRequested: true, reviewComplete: false },
    exitCode: 1,
    published: true,
  });
  expect(s.judge).toHaveBeenCalledTimes(1);
  expect(s.retroJudge).toHaveBeenCalledTimes(1);
  expect(s.write.mock.calls[0]?.[2]).toContain("new-call cap or judgment disabled");
});
it("refreshes changed Retro sources and removes prior interpretation on context-only replay", async () => {
  const s = setup([]);
  s.readRetro.mockResolvedValueOnce(retroRead([retroEntry("I finished the inspection.")]));
  await publishEmailBrief({ ...options, retroReview: true }, s.deps);
  s.readRetro.mockResolvedValueOnce(retroRead([retroEntry("I am waiting for confirmation.")]));
  const result = await publishEmailBrief({ ...options, maxNew: 0 }, s.deps);
  expect(result).toMatchObject({ published: true, newRequests: 0 });
  const replay = s.write.mock.calls[1]?.[2];
  expect(replay).toContain("waiting for confirmation");
  expect(replay).not.toContain("finished the inspection");
  expect(replay).toContain("Interpretation not requested");
  expect(s.retroJudge).toHaveBeenCalledTimes(2);
  expect(s.session.save).not.toHaveBeenCalled();
});
it("publishes Retro read failures without exposing private diagnostics or inferred completion", async () => {
  const s = setup([]);
  s.readRetro.mockRejectedValueOnce(new Error("private Retro body"));
  const result = await publishEmailBrief({ ...options, retroReview: true }, s.deps);
  expect(result).toMatchObject({
    published: true,
    exitCode: 1,
    retro: { state: "unavailable", entries: 0 },
  });
  expect(JSON.stringify(result)).not.toContain("private");
  expect(s.retroJudge).not.toHaveBeenCalled();
  expect(s.write.mock.calls[0]?.[2]).toContain("Retro context unavailable: read-failed");
});
it.each([[], ["retro", "another-retro"]])(
  "does not guess a missing or ambiguous Retro identity: %j",
  async (...ids) => {
    const s = setup([]);
    s.read.mockResolvedValueOnce({ ...todoistInventory(), retroProjectIds: ids });
    const result = await publishEmailBrief({ ...options, retroReview: true }, s.deps);
    expect(result).toMatchObject({ published: true, exitCode: 1, retro: { state: "unavailable" } });
    expect(s.readRetro).not.toHaveBeenCalled();
    expect(s.retroJudge).not.toHaveBeenCalled();
  },
);
it("stops publication and rejects late Retro judgments after cancellation", async () => {
  const s = setup([]);
  s.readRetro.mockResolvedValue(retroRead([retroEntry()]));
  s.retroJudge.mockImplementationOnce(async (request) => {
    s.signal.abort();
    return retroResponse(request);
  });
  expect(await publishEmailBrief({ ...options, retroReview: true }, s.deps)).toMatchObject({
    published: false,
    failure: "cancelled",
    newRequests: 1,
  });
  expect(s.retroJudge).toHaveBeenCalledTimes(1);
  expect(s.write).not.toHaveBeenCalled();
});
it("refreshes renamed/moved/removed tasks on cached-only replay without altering saved email decisions", async () => {
  const s = setup();
  await publishEmailBrief(options, s.deps);
  expect(s.write.mock.calls[0]?.[2]).toContain("Already tracked (explicit source link)");
  const next = todoistInventory();
  next.projects = [{ id: "personal", name: "Personal Projects" }];
  const task = next.tasks[0];
  if (!task) throw new Error("fixture");
  task.projectId = "personal";
  task.content = "Book the inspection";
  task.due = null;
  s.read.mockResolvedValueOnce(next);
  expect(await publishEmailBrief({ ...options, maxNew: 0 }, s.deps)).toMatchObject({
    newRequests: 0,
    cached: 1,
    todoist: { complete: true, tasks: 1 },
    exitCode: 0,
  });
  expect(s.write.mock.calls[1]?.[2]).toContain("### Personal Projects");
  expect(s.write.mock.calls[1]?.[2]).toContain("Book the inspection");
  expect(s.write.mock.calls[1]?.[2]).not.toContain("Arrange boiler inspection");
  s.read.mockResolvedValueOnce({ ...next, tasks: [] });
  await publishEmailBrief({ ...options, maxNew: 0 }, s.deps);
  expect(s.write.mock.calls[2]?.[2]).not.toContain("Already tracked (explicit source link)");
  expect(s.read).toHaveBeenCalledTimes(3);
  expect(s.judge).toHaveBeenCalledTimes(1);
  expect(s.session.save).toHaveBeenCalledTimes(1);
});
it("publishes explicit Todoist failure without stale contents or private diagnostics", async () => {
  const s = setup([]);
  s.read.mockRejectedValueOnce(new Error("private-project-name email@example.com"));
  const result = await publishEmailBrief(options, s.deps);
  expect(result).toMatchObject({
    published: true,
    exitCode: 1,
    todoist: { state: "unavailable", complete: false, tasks: 0 },
  });
  expect(s.write.mock.calls[0]?.[2]).toContain("Todoist context unavailable: read-failed");
  expect(JSON.stringify(result)).not.toMatch(/private|@|Home|task-1/);
  expect(s.write.mock.calls[0]?.[2]).not.toContain("Arrange boiler inspection");
});
it("reports missing Todoist configuration and partial pages as degraded publications", async () => {
  const s = setup([]);
  const { todoist: _todoist, ...without } = s.deps;
  expect(await publishEmailBrief(options, without)).toMatchObject({
    published: true,
    exitCode: 1,
    todoist: { state: "unavailable" },
  });
  expect(s.write.mock.calls[0]?.[2]).toContain("missing-token");
  s.read.mockResolvedValueOnce({ ...todoistInventory(), tasksComplete: false });
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    published: true,
    exitCode: 1,
    todoist: { state: "available", complete: false },
  });
  expect(s.write.mock.calls[1]?.[2]).toContain("Todoist coverage: INCOMPLETE");
});
it("does not publish a late Todoist read after cancellation", async () => {
  const s = setup([]);
  s.read.mockImplementationOnce(async () => {
    s.signal.abort();
    return todoistInventory();
  });
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    published: false,
    failure: "cancelled",
  });
  expect(s.write).not.toHaveBeenCalled();
});
it("saves new decisions then republishes unchanged inputs without another inference", async () => {
  const s = setup();
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    published: true,
    classified: 1,
    newRequests: 1,
    inputTokens: 100,
    exitCode: 0,
  });
  expect(await publishEmailBrief({ ...options, maxNew: 0 }, s.deps)).toMatchObject({
    published: true,
    classified: 0,
    cached: 1,
    newRequests: 0,
  });
  expect(s.judge).toHaveBeenCalledTimes(1);
  expect(s.session.save).toHaveBeenCalledTimes(1);
  expect(s.session.sample).toHaveBeenCalledWith("2026-10-04T12:00:00.000Z", briefTime, 10);
  expect(s.write).toHaveBeenCalledTimes(2);
  expect(s.session.published).toHaveBeenCalledWith(briefFile, briefGeneration, briefTime);
  const text = s.write.mock.calls[0]?.[2];
  expect(text).toContain("1 of 12 eligible complete stored conversations");
  expect(text).toContain("Pending retrievals: 10");
  expect(text).not.toContain("Please send two dates");
});
it("invalidates cached inference when directions or evidence change", async () => {
  const record = briefRecord();
  const s = setup([record]);
  await publishEmailBrief(options, s.deps);
  record.fingerprint = "a".repeat(64);
  await publishEmailBrief(options, s.deps);
  if (record.conversation) record.conversation.directions = ["sent", "incoming"];
  await publishEmailBrief(options, s.deps);
  expect(s.judge).toHaveBeenCalledTimes(3);
});
it("enforces owner exclusions before cached or new model decisions", async () => {
  const record = briefRecord();
  const conversation = record.conversation;
  if (!conversation) throw new Error("fixture");
  const message = conversation.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.from = [{ address: "notifications@github.com" }];
  message.subject = "Review requested (PR #123)";
  record.saved = {
    policy: briefPolicy,
    inputHash: briefInputHash(record.fingerprint, conversation.directions),
    decision: { type: "jev", result: triageResponse() },
  };
  const s = setup([record]);
  expect(await publishEmailBrief({ ...options, maxNew: 0 }, s.deps)).toMatchObject({
    excluded: 1,
    cached: 0,
    classified: 0,
    newRequests: 0,
  });
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.write.mock.calls[0]?.[2]).toContain("ignored-routine-github");
});
it("publishes failures and capped work as uncertainty without consuming their jobs or leaking console data", async () => {
  const s = setup([briefRecord(), briefRecord(), briefRecord()]);
  s.judge.mockRejectedValueOnce(new Error("private body email@example.com"));
  const result = await publishEmailBrief({ ...options, maxNew: 1 }, s.deps);
  expect(result).toMatchObject({
    published: true,
    failed: 1,
    capped: 2,
    newRequests: 1,
    exitCode: 1,
  });
  expect(s.session.save).not.toHaveBeenCalled();
  expect(s.write.mock.calls[0]?.[2]).toContain("unclassified: provider-error");
  expect(JSON.stringify(result)).not.toMatch(/private|@|Boiler|t-boiler/);
});
it("fails closed on invalid saved judgments and stores semantic unknowns for review", async () => {
  const record = briefRecord();
  record.saved = { private: "corrupt-cache" };
  const s = setup([record, briefRecord()]);
  const raw = triageResponse();
  raw.answers.attention.choice = "unknown";
  s.judge.mockResolvedValue(raw);
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    failed: 1,
    classified: 1,
    newRequests: 1,
  });
  const text = s.write.mock.calls[0]?.[2];
  expect(text).toContain("unclassified: invalid-cache");
  expect(text).toContain("attention: unknown");
  expect(s.session.save).toHaveBeenCalledTimes(1);
});
it("does not publish after failed persistence, overlap or cancellation", async () => {
  const s = setup();
  vi.mocked(s.session.save).mockRejectedValueOnce(new Error("private-db"));
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    published: false,
    failure: "classification-save",
  });
  expect(s.write).not.toHaveBeenCalled();
  s.signal.abort();
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    published: false,
    failure: "cancelled",
  });
  expect(s.judge).toHaveBeenCalledTimes(1);
  s.deps.database.exclusive = async () => undefined as never;
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    overlapping: true,
    newRequests: 0,
  });
});
it("reserves an allocated ID before publication and does not settle failed remote writes", async () => {
  const s = setup([]);
  vi.mocked(s.session.destination).mockResolvedValue(undefined);
  s.write.mockRejectedValueOnce(new Error("private-response"));
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    failure: "publication",
    published: false,
  });
  expect(s.session.reserve).toHaveBeenCalledWith(briefFile);
  expect(s.session.publishing).toHaveBeenCalledTimes(1);
  expect(s.session.published).not.toHaveBeenCalled();
  expect(vi.mocked(s.session.reserve).mock.invocationCallOrder[0]).toBeLessThan(
    s.write.mock.invocationCallOrder[0] ?? 0,
  );
});
it("rejects a late result after cancellation and stops before another request", async () => {
  const s = setup([briefRecord(), briefRecord()]);
  s.judge.mockImplementation(async () => {
    s.signal.abort();
    return triageResponse();
  });
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    classified: 0,
    newRequests: 1,
    published: false,
  });
  expect(s.judge).toHaveBeenCalledTimes(1);
  expect(s.session.save).not.toHaveBeenCalled();
});
it("keeps oversized evidence local and malformed provider output retryable", async () => {
  const record = briefRecord();
  const message = record.conversation?.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.body = { status: "complete", text: "x".repeat(32768) };
  const s = setup([record, briefRecord()]);
  s.judge.mockResolvedValue({ private: "invalid" } as never);
  expect(await publishEmailBrief(options, s.deps)).toMatchObject({
    failed: 2,
    newRequests: 1,
    classified: 0,
  });
  expect(s.session.save).not.toHaveBeenCalled();
  expect(s.write.mock.calls[0]?.[2]).toContain("input-too-large");
  expect(s.write.mock.calls[0]?.[2]).toContain("invalid-result");
});
it("enforces the shared deadline before accepting or saving a late judgment", async () => {
  vi.useFakeTimers();
  try {
    const s = setup([briefRecord(), briefRecord()]);
    s.judge.mockImplementation(async () => {
      await vi.advanceTimersByTimeAsync(120001);
      return triageResponse();
    });
    expect(await publishEmailBrief(options, s.deps)).toMatchObject({
      published: false,
      newRequests: 1,
      classified: 0,
    });
    expect(s.judge).toHaveBeenCalledTimes(1);
    expect(s.session.save).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
it("groups waiting and resolution suggestions conservatively and escapes untrusted subject markup", () => {
  const result = triageResponse();
  result.answers.lifecycle.choice = "waiting";
  const entry = {
    sourceId: "id/with spaces",
    receivedAt: briefTime,
    subject: "[click](https://evil)\n# injection <tag>",
    decision: { type: "jev" as const, result },
  };
  expect(briefGroup(entry)).toBe("Waiting");
  result.answers.lifecycle.choice = "resolution-suggested";
  expect(briefGroup(entry)).toBe("Uncertain / review");
  const text = renderEmailBrief({
    generation: briefGeneration,
    generatedAt: briefTime,
    since: briefTime,
    until: briefTime,
    eligible: 1,
    status: briefStatus(),
    entries: [entry],
  });
  expect(text).not.toContain("\n# injection");
  expect(text).toContain("\\[click\\]");
  expect(text).toContain("#all/id%2Fwith%20spaces");
  expect(text).toContain("Complete evidence freshness: not established");
});
it.each([
  ["--max-conversations", "21"],
  ["--max-new", "-1"],
  ["--days", "31"],
  ["--days", "1", "--days", "2"],
  ["--unknown", "private"],
])("rejects invalid bounded command options: %j", (...args) => {
  expect(() => briefOptions(args)).toThrow("brief:publish options");
});

it("parses explicit Retro review independently of numeric option ordering", () => {
  expect(briefOptions(["--retro-review", "--max-new", "0", "--days", "3"])).toEqual({
    maxConversations: 10,
    days: 3,
    maxNew: 0,
    retroReview: true,
  });
  expect(briefOptions(["--max-new", "2", "--retro-review"])).toEqual({
    maxConversations: 10,
    days: 7,
    maxNew: 2,
    retroReview: true,
  });
  expect(briefOptions([]).retroReview).toBeUndefined();
  for (const args of [
    ["--retro-review", "false"],
    ["--retro-review", "--retro-review"],
  ])
    expect(() => briefOptions(args)).toThrow("brief:publish options");
});
