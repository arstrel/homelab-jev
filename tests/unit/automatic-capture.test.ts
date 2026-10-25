import { afterEach, expect, it, vi } from "vitest";
import { type CaptureSession, captureMail } from "../../src/application/capture-mail.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { briefOptions } from "../../src/cli-email-brief.js";
import {
  type CaptureInventory,
  captureAnswer,
  captureQuestion,
} from "../../src/domain/automatic-capture.js";
import { briefInputHash, briefPolicy } from "../../src/domain/email-brief.js";
import { fingerprint } from "../../src/domain/mail-evidence.js";
import { taskConversation, taskProjects, taskResponse } from "../fixtures/email-task.js";
import { triageResponse } from "../fixtures/triage.js";

const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function response(existing = "none") {
  const raw = taskResponse();
  return {
    ...raw,
    answers: { ...raw.answers, existing: { type: "choice", choice: existing, confidence: 1 } },
  };
}
function setup() {
  const conversation = taskConversation();
  const fp = fingerprint(conversation.evidence);
  const triage = triageResponse();
  triage.answers.attention.confidence = 1;
  triage.answers.lifecycle.confidence = 1;
  const record = {
    jobId: "00000000-0000-4000-8000-000000000001",
    sourceId: "t-boiler",
    fingerprint: fp,
    conversation,
    saved: {
      policy: briefPolicy,
      inputHash: briefInputHash(fp, conversation.directions),
      decision: { type: "jev", result: triage },
    },
  };
  const session: CaptureSession = {
    select: vi.fn(async () => [record]),
    record: vi.fn(async () => {}),
    link: vi.fn(async () => {}),
    current: vi.fn(async () => conversation),
    reserve: vi.fn(async () => ({ status: "ready" as const, requestId: "request" })),
    complete: vi.fn(async () => {}),
  };
  const inventory: CaptureInventory = { projects: taskProjects.slice(0, 2), tasks: [] };
  const remote = {
    inventory: vi.fn(async () => structuredClone(inventory)),
    create: vi.fn(async () => "task-created"),
  };
  const allowance = {
    reserveInference: vi.fn(async () => true),
    settleInference: vi.fn(async () => {}),
  };
  const judge = vi.fn(async () => response());
  const prepare = vi.fn(() => judge);
  const budget = new MailBudget();
  budgets.push(budget);
  const run = () =>
    captureMail("2026-08-01T00:00:00.000Z", {
      session,
      remote,
      allowance,
      prepare,
      budget,
      now: new Date("2026-10-11T12:00:00Z"),
    });
  return { record, conversation, session, inventory, remote, allowance, judge, prepare, run };
}
it("creates one source-supported task through durable admission and settles shared inference usage", async () => {
  const s = setup();
  expect(await s.run()).toMatchObject({ created: 1, newRequests: 1, ambiguous: false });
  expect(s.allowance.reserveInference).toHaveBeenCalledBefore(s.judge);
  expect(s.prepare).toHaveBeenCalledBefore(s.allowance.reserveInference);
  expect(s.session.reserve).toHaveBeenCalledWith(
    expect.objectContaining({ projectId: "home", sourceId: "t-boiler" }),
    3,
  );
  expect(s.session.reserve).toHaveBeenCalledBefore(s.remote.create);
  expect(s.session.complete).toHaveBeenCalledWith(
    expect.objectContaining({ sourceId: "t-boiler" }),
    "request",
    "task-created",
  );
  expect(s.remote.inventory).toHaveBeenCalledTimes(2);
});
it.each([false, true])(
  "links exact references including completed=%s without inference or edits",
  async (completed) => {
    const s = setup();
    s.inventory.tasks.push({
      id: "existing",
      projectId: "home",
      title: "My edited title",
      completed,
      sourceIds: ["t-boiler"],
    });
    expect(await s.run()).toMatchObject({ matched: 1, created: 0 });
    expect(s.session.link).toHaveBeenCalledWith("t-boiler", "existing");
    expect(s.judge).not.toHaveBeenCalled();
    expect(s.remote.create).not.toHaveBeenCalled();
  },
);
it("routes competing exact references to review", async () => {
  const s = setup();
  for (const id of ["one", "two"])
    s.inventory.tasks.push({
      id,
      projectId: "home",
      title: id,
      completed: false,
      sourceIds: ["t-boiler"],
    });
  expect(await s.run()).toMatchObject({ review: 1, matched: 0 });
  expect(s.judge).not.toHaveBeenCalled();
});
it("matches a bounded semantic candidate without modifying or recreating it", async () => {
  const s = setup();
  s.inventory.tasks.push({
    id: "existing",
    projectId: "home",
    title: "Arrange inspection dates",
    completed: true,
    sourceIds: [],
  });
  s.judge.mockResolvedValue(response("t0"));
  expect(await s.run()).toMatchObject({ matched: 1, created: 0 });
  expect(s.session.link).toHaveBeenCalledWith("t-boiler", "existing");
  expect(s.remote.create).not.toHaveBeenCalled();
});
it("keeps uncertain, low-confidence or Inbox routing review-only", () => {
  const s = setup(),
    q = captureQuestion(s.conversation, s.inventory);
  for (const raw of [
    response("unknown"),
    {
      ...response(),
      answers: {
        ...response().answers,
        eligibility: { type: "choice", choice: "required", confidence: 0.9 },
      },
    },
    {
      ...response(),
      answers: {
        ...response().answers,
        project: { type: "choice", choice: "unknown", confidence: 1 },
      },
    },
  ])
    expect(captureAnswer(raw, q).type).toBe("review");
  expect(() => captureAnswer(response("t999"), q)).toThrow();
});
it("refuses to spend without allowance", async () => {
  const s = setup();
  s.allowance.reserveInference.mockResolvedValue(false);
  expect(await s.run()).toMatchObject({ budgetExhausted: true, newRequests: 0 });
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.remote.create).not.toHaveBeenCalled();
});
it("keeps deterministic full-request validation failures review-only without reserving credit", async () => {
  const s = setup();
  s.prepare.mockImplementation(() => {
    throw new Error("input-too-large");
  });
  expect(await s.run()).toMatchObject({ review: 1, failed: 0, newRequests: 0 });
  expect(s.allowance.reserveInference).not.toHaveBeenCalled();
  expect(s.allowance.settleInference).not.toHaveBeenCalled();
  expect(s.judge).not.toHaveBeenCalled();
  expect(s.session.record).toHaveBeenCalledWith(s.record, "review", null);
  expect(s.remote.create).not.toHaveBeenCalled();
});
it("retains ambiguous inference charges and defers failed work", async () => {
  const s = setup();
  s.judge.mockRejectedValue(new Error("private data"));
  expect(await s.run()).toMatchObject({ failed: 1 });
  expect(s.allowance.settleInference).not.toHaveBeenCalled();
  expect(s.session.record).toHaveBeenCalledWith(
    s.record,
    "failed",
    new Date("2026-10-11T13:00:00Z"),
  );
});
it.each(["inventory", "evidence"])(
  "defers a failed post-inference %s recheck and stops the batch",
  async (read) => {
    const s = setup();
    vi.mocked(s.session.select).mockResolvedValue([
      s.record,
      { ...s.record, sourceId: "next-source" },
    ]);
    if (read === "inventory")
      s.remote.inventory
        .mockResolvedValueOnce(structuredClone(s.inventory))
        .mockRejectedValueOnce(new Error("provider unavailable"));
    else vi.mocked(s.session.current).mockRejectedValueOnce(new Error("read unavailable"));
    expect(await s.run()).toMatchObject({ failed: 1, created: 0, newRequests: 1 });
    expect(s.judge).toHaveBeenCalledOnce();
    expect(s.allowance.settleInference).toHaveBeenCalledOnce();
    expect(s.session.record).toHaveBeenCalledWith(
      s.record,
      "failed",
      new Date("2026-10-11T13:00:00Z"),
      expect.any(Object),
    );
    expect(s.remote.create).not.toHaveBeenCalled();
    expect(s.session.reserve).not.toHaveBeenCalled();
  },
);
it("does not create when source evidence or task inventory changes", async () => {
  const s = setup();
  s.remote.inventory.mockResolvedValueOnce(structuredClone(s.inventory)).mockResolvedValueOnce({
    ...s.inventory,
    tasks: [
      { id: "new", projectId: "home", title: "Changed by me", completed: false, sourceIds: [] },
    ],
  });
  expect(await s.run()).toMatchObject({ review: 1, created: 0 });
  expect(s.session.reserve).not.toHaveBeenCalled();
});
it("respects persistent mappings/suppressions and the daily creation cap", async () => {
  for (const status of ["linked", "suppressed", "capped"] as const) {
    const s = setup();
    vi.mocked(s.session.reserve).mockResolvedValue(
      status === "linked" ? { status, taskId: "existing" } : { status },
    );
    expect(await s.run()).toMatchObject({
      created: 0,
      ...(status === "capped" ? { capped: 1 } : { skipped: 1 }),
    });
    expect(s.remote.create).not.toHaveBeenCalled();
  }
});
it("keeps lost writes ambiguous and never dispatches a second create", async () => {
  const s = setup();
  s.remote.create.mockRejectedValue(new Error("response lost"));
  expect(await s.run()).toMatchObject({ ambiguous: true, created: 0 });
  expect(s.remote.create).toHaveBeenCalledOnce();
  expect(s.session.complete).not.toHaveBeenCalled();
});
it("requires explicit classifier opt-in and rejects duplicate capture flags", () => {
  expect(briefOptions(["--max-new", "0", "--classify-pending", "--capture-tasks"])).toMatchObject({
    classifyPending: true,
    captureTasks: true,
  });
  expect(() => briefOptions(["--max-new", "0", "--capture-tasks"])).toThrow();
  expect(() =>
    briefOptions(["--max-new", "0", "--classify-pending", "--capture-tasks", "--capture-tasks"]),
  ).toThrow();
});
it("does not submit stale cached decisions or uncertain classifications", async () => {
  const s = setup();
  s.record.saved.decision.result.answers.attention.confidence = 0.8;
  expect(await s.run()).toMatchObject({ review: 1, created: 0, newRequests: 0 });
  expect(s.allowance.reserveInference).not.toHaveBeenCalled();
});
it("does not create after new evidence arrives during judgment", async () => {
  const s = setup(),
    changed = structuredClone(s.conversation);
  const message = changed.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.subject = "New reply";
  vi.mocked(s.session.current).mockResolvedValue(changed);
  expect(await s.run()).toMatchObject({ review: 1, created: 0 });
  expect(s.session.reserve).not.toHaveBeenCalled();
});
it("leaves FYI/resolved judgments without a task", async () => {
  const s = setup();
  s.judge.mockResolvedValue({
    ...response(),
    answers: {
      ...response().answers,
      eligibility: { ...response().answers.eligibility, choice: "none", confidence: 1 },
    },
  });
  expect(await s.run()).toMatchObject({ skipped: 1, created: 0 });
  expect(s.remote.create).not.toHaveBeenCalled();
});
it.each(["none", "resolved"])(
  "discloses low-confidence %s judgments for review",
  async (choice) => {
    const s = setup();
    s.judge.mockResolvedValue({
      ...response(),
      answers: {
        ...response().answers,
        eligibility: { ...response().answers.eligibility, choice, confidence: 0 },
      },
    });
    expect(await s.run()).toMatchObject({ review: 1, skipped: 0, created: 0 });
    expect(s.session.record).toHaveBeenCalledWith(
      s.record,
      "review",
      null,
      expect.objectContaining({ type: "review" }),
    );
    expect(s.remote.create).not.toHaveBeenCalled();
  },
);
