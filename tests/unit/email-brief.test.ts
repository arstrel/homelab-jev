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
import {
  briefFile,
  briefGeneration,
  briefRecord,
  briefStatus,
  briefTime,
} from "../fixtures/email-brief.js";
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
  const signal = new AbortController();
  const deps = {
    database: {
      exclusive: async <T>(run: (s: BriefSession, signal: AbortSignal) => Promise<T>) =>
        run(session, signal.signal),
    },
    status: { read: async () => briefStatus() },
    triage: { judge },
    drive: () => ({ write, allocate }),
    clock: { now: () => new Date(briefTime), id: () => briefGeneration },
    signal: signal.signal,
  };
  return { session, judge, write, allocate, signal, deps };
}
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
