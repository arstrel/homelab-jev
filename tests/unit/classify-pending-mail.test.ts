import { expect, it, vi } from "vitest";
import {
  classifyPendingMail,
  type PendingMailSession,
} from "../../src/application/classify-pending-mail.js";
import { briefOptions } from "../../src/cli-email-brief.js";
import { briefInputHash, briefPolicy } from "../../src/domain/email-brief.js";
import { briefRecord, briefTime } from "../fixtures/email-brief.js";
import { triageResponse } from "../fixtures/triage.js";

function setup() {
  const record = briefRecord();
  const session: PendingMailSession = {
    pending: vi.fn(async () => [record]),
    save: vi.fn(async () => {}),
    defer: vi.fn(async () => {}),
    reserveInference: vi.fn(async () => true),
    settleInference: vi.fn(async () => {}),
  };
  const judge = vi.fn(async () => triageResponse());
  const signal = new AbortController();
  const run = () => classifyPendingMail(session, { judge }, new Date(briefTime), signal.signal);
  return { record, session, judge, signal, run };
}
it("bounds selection independently of display and persists exact validated decisions", async () => {
  const s = setup();
  expect(await s.run()).toMatchObject({ selected: 1, classified: 1, newRequests: 1, failed: 0 });
  expect(s.session.pending).toHaveBeenCalledWith(new Date(briefTime), 10);
  expect(s.session.reserveInference).toHaveBeenCalledBefore(s.judge);
  expect(s.session.settleInference).toHaveBeenCalledWith(triageResponse().usage.input_tokens);
  expect(s.session.save).toHaveBeenCalledWith(s.record, {
    policy: briefPolicy,
    inputHash: briefInputHash(s.record.fingerprint, ["incoming", "sent"]),
    decision: { type: "jev", result: triageResponse() },
  });
});
it("reuses exact cache without reserving money and rejects stale directions", async () => {
  const s = setup();
  s.record.saved = {
    policy: briefPolicy,
    inputHash: briefInputHash(s.record.fingerprint, ["incoming", "sent"]),
    decision: { type: "jev", result: triageResponse() },
  };
  expect(await s.run()).toMatchObject({ cached: 1, newRequests: 0 });
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.session.reserveInference).not.toHaveBeenCalled();
  if (s.record.conversation) s.record.conversation.directions[0] = "unknown";
  expect(await s.run()).toMatchObject({ classified: 1, newRequests: 1 });
});
it("retains reservations and defers provider errors without leaking content", async () => {
  const s = setup();
  s.judge.mockRejectedValue(new Error("private email"));
  const result = await s.run();
  expect(result).toMatchObject({ failed: 1, newRequests: 1 });
  expect(JSON.stringify(result)).not.toContain("private email");
  expect(s.session.settleInference).not.toHaveBeenCalled();
  expect(s.session.save).not.toHaveBeenCalled();
  expect(s.session.defer).toHaveBeenCalledWith(s.record, new Date("2026-10-11T13:00:00Z"));
});
it("does not admit a request without allowance", async () => {
  const s = setup();
  vi.mocked(s.session.reserveInference).mockResolvedValue(false);
  expect(await s.run()).toMatchObject({ budgetExhausted: true, newRequests: 0 });
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.session.defer).not.toHaveBeenCalled();
});
it("defers oversized evidence before reserving or calling", async () => {
  const s = setup();
  const message = s.record.conversation?.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.body = { status: "complete", text: "x".repeat(33_000) };
  expect(await s.run()).toMatchObject({ failed: 1, newRequests: 0 });
  expect(s.session.reserveInference).not.toHaveBeenCalled();
});
it("stops on settlement ambiguity and never retries a refund", async () => {
  const s = setup();
  vi.mocked(s.session.settleInference).mockRejectedValue(new Error("connection lost"));
  await expect(s.run()).rejects.toThrow("connection lost");
  expect(s.session.settleInference).toHaveBeenCalledTimes(1);
  expect(s.session.save).not.toHaveBeenCalled();
});
it("keeps a maximum charge when returned usage violates the default context", async () => {
  const s = setup();
  s.judge.mockResolvedValue({
    ...triageResponse(),
    usage: { input_tokens: 64_001, output_tokens: 0 },
  });
  expect(await s.run()).toMatchObject({ failed: 1 });
  expect(s.session.settleInference).not.toHaveBeenCalled();
});
it("stops before provider access when cancelled", async () => {
  const s = setup();
  s.signal.abort();
  await expect(s.run()).rejects.toThrow();
  expect(s.judge).not.toHaveBeenCalled();
});
it("requires cached-only display and no Retro inference for automatic preprocessing", () => {
  expect(briefOptions(["--max-new", "0", "--classify-pending"])).toMatchObject({
    classifyPending: true,
    maxNew: 0,
  });
  expect(() => briefOptions(["--classify-pending"])).toThrow();
  expect(() => briefOptions(["--max-new", "0", "--classify-pending", "--retro-review"])).toThrow();
});

it("applies routine GitHub owner exclusions without hosted calls or spending", async () => {
  const s = setup();
  const message = s.record.conversation?.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.from = [{ address: "notifications@github.com" }];
  message.subject = "Review requested (PR #123)";
  expect(await s.run()).toMatchObject({ excluded: 1, classified: 0, newRequests: 0 });
  expect(s.session.reserveInference).not.toHaveBeenCalled();
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.session.save).toHaveBeenCalled();
});
