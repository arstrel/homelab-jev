import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import {
  applyEmailTasks,
  type EmailTaskRemote,
  type EmailTaskWriter,
  previewEmailTasks,
  type TaskJudge,
} from "../../src/application/email-tasks.js";
import { MailBudget } from "../../src/application/mail-budget.js";
import { emailTaskOptions, runEmailTasks } from "../../src/cli-email-tasks.js";
import {
  actionSentences,
  emailTaskKey,
  taskExclusion,
  taskReviewSchema,
  taskTitles,
} from "../../src/domain/email-task.js";
import {
  taskConversation,
  taskProjects,
  taskResponse,
  taskReview,
} from "../fixtures/email-task.js";
import { threadRead } from "../fixtures/mail.js";

const budgets: MailBudget[] = [];
afterEach(() => {
  for (const b of budgets.splice(0)) b.close();
});
function budget() {
  const b = new MailBudget();
  budgets.push(b);
  return b;
}
function writer(): EmailTaskWriter {
  return {
    current: vi.fn(async (id) => taskConversation(id)),
    reserve: vi.fn(async () => ({ status: "ready" as const, requestId: "request-fixture" })),
    complete: vi.fn(async () => {}),
  };
}
it("previews exact source sentences, excludes Retro and falls back to Inbox without writes", async () => {
  const sample = vi.fn(async () => [taskConversation()]);
  const exclusive = vi.fn();
  const create = vi.fn();
  const close = vi.fn(async () => {});
  const judge = vi.fn<TaskJudge>(async () => taskResponse("a0", "unknown"));
  const save = vi.fn(() => "private-review.json");
  const report = await runEmailTasks(
    ["preview", "--offset", "10"],
    {
      DB_URL: "postgresql://fake:fake@127.0.0.1:1/fake",
      JEV_API_KEY: "fake",
      TODOIST_API_TOKEN: "fake",
    },
    {
      database: () => ({ sample, exclusive, close }),
      remote: () => ({ projects: async () => taskProjects, create }),
      judge: () => judge,
      save,
    },
  );
  expect(report).toMatchObject({
    sampled: 1,
    exitCode: 0,
    candidates: [{ candidate: 1, title: taskReview().candidates[0]?.title, project: "Inbox" }],
  });
  expect(judge.mock.calls[0]?.[0].projects.map((p) => p.id)).toEqual(["inbox", "home"]);
  expect(sample).toHaveBeenCalledWith(10);
  expect(exclusive).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  expect(save).toHaveBeenCalledOnce();
  expect(close).toHaveBeenCalledOnce();
});
it("skips sent and quoted lines and leaves unknown/no-action conversations without proposals", async () => {
  const read = threadRead();
  expect(actionSentences({ evidence: read.evidence, directions: ["incoming", "sent"] })).toEqual([
    "Please send two dates for the boiler inspection.",
  ]);
  const conversation = taskConversation();
  const message = conversation.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.body = {
    status: "complete",
    text: "> Quoted request to do something.\nPlease confirm the appointment.",
  };
  expect(actionSentences(conversation)).toEqual(["Please confirm the appointment."]);
  const judge = vi
    .fn()
    .mockResolvedValueOnce(taskResponse("none"))
    .mockResolvedValueOnce(taskResponse("unknown"));
  const result = await previewEmailTasks(
    [conversation, conversation],
    taskProjects,
    judge,
    budget(),
    new Date(),
  );
  expect(result.review.candidates).toEqual([]);
  expect(result.outcomes.map((r) => r.status)).toEqual(["no-clear-action", "no-clear-action"]);
});
it("rejects invented choices and oversized input without a proposal or partial truncation", async () => {
  const judge = vi.fn(async () => taskResponse("invented"));
  expect(
    (await previewEmailTasks([taskConversation()], taskProjects, judge, budget(), new Date()))
      .outcomes[0]?.status,
  ).toBe("not-proposed");
  const huge = taskConversation();
  const message = huge.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.body = { status: "complete", text: "x".repeat(33_000) };
  judge.mockClear();
  expect(
    (await previewEmailTasks([huge], taskProjects, judge, budget(), new Date())).outcomes[0]
      ?.status,
  ).toBe("not-proposed");
  expect(judge).not.toHaveBeenCalled();
});
it.each([
  ["none", "Newsletter", "View this post on the web. Optional reading is available."],
  ["none", "Optional reward", "Trade to claim your bonus. This is an optional promotion."],
  ["conditional", "Account linked", "If you do not recognize this activity, contact support."],
  ["resolved", "Appointment", "Thank you, this is handled. No reply needed."],
  ["unknown", "Unclear request", "Please see the attachment for details."],
])(
  "blocks %s eligibility even when another answer selects a sentence",
  async (eligibility, subject, text) => {
    const conversation = taskConversation();
    const message = conversation.evidence.messages[0];
    if (!message) throw new Error("fixture");
    message.subject = subject;
    message.body = { status: "complete", text };
    const result = await previewEmailTasks(
      [conversation],
      taskProjects,
      async () => taskResponse("a0", "p1", eligibility),
      budget(),
      new Date(),
    );
    expect(result.review.candidates).toEqual([]);
    expect(result.outcomes).toEqual([{ sample: 1, status: "no-clear-action" }]);
  },
);
it("uses the originating subject for an approved generic review link and revalidates that title on apply", async () => {
  const conversation = taskConversation();
  const message = conversation.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.subject = "New service letter";
  message.body = { status: "complete", text: "Click or tap below to review." };
  const { review } = await previewEmailTasks(
    [conversation],
    taskProjects,
    async () => taskResponse(),
    budget(),
    new Date(),
  );
  expect(review.candidates[0]?.title).toBe("Review: New service letter");
  const db = writer();
  db.current = async () => conversation;
  const create = vi.fn<EmailTaskRemote["create"]>(async () => "review-task");
  expect(
    await applyEmailTasks(
      review,
      [1],
      taskProjects,
      db,
      { projects: async () => taskProjects, create },
      budget(),
    ),
  ).toMatchObject([{ status: "created" }]);
  expect(create.mock.calls[0]?.[0]).toMatchObject({ title: "Review: New service letter" });
  message.subject = "Settings page improvements (PR #42)";
  message.body = {
    status: "complete",
    text: "You are receiving this because your review was requested.",
  };
  expect(taskTitles(conversation)[0]?.title).toBe("Review: Settings page improvements (PR #42)");
  message.subject = "";
  expect(taskTitles(conversation)).toEqual([]);
  message.body = { status: "complete", text: "Click here to continue." };
  expect(taskTitles(conversation)).toEqual([]);
});
it("rejects old review policy files while preserving the v1 remote-write identity", () => {
  expect(
    taskReviewSchema.safeParse({ ...taskReview(), version: "reviewed-email-tasks/v1" }).success,
  ).toBe(false);
  expect(emailTaskKey("t-boiler")).toMatch(/^reviewed-email-tasks\/v1:[a-f0-9]{64}$/);
});
it.each([
  [
    "notifications@github.com",
    "[example/repo] Improve settings (PR #42)",
    "ignored-routine-github",
  ],
  [
    "CloudPlatform-noreply@google.com",
    "[Legal Notice] Updates to Google Cloud Terms of Service",
    "ignored-google-cloud-terms",
  ],
])(
  "applies the owner's %s exclusion before Jev and blocks old proposals on apply",
  async (sender, subject, reason) => {
    const conversation = taskConversation();
    const message = conversation.evidence.messages[0];
    if (!message) throw new Error("fixture");
    message.from = [{ address: sender }];
    message.subject = subject;
    const judge = vi.fn();
    const result = await previewEmailTasks(
      [conversation],
      taskProjects,
      judge,
      budget(),
      new Date(),
    );
    expect(result.review.candidates).toEqual([]);
    expect(result.outcomes).toEqual([{ sample: 1, status: reason }]);
    expect(judge).not.toHaveBeenCalled();
    const db = writer();
    db.current = async () => conversation;
    const create = vi.fn();
    expect(
      await applyEmailTasks(
        taskReview(),
        [1],
        taskProjects,
        db,
        { projects: async () => taskProjects, create },
        budget(),
      ),
    ).toEqual([{ candidate: 1, status: "excluded-by-policy" }]);
    expect(db.reserve).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  },
);
it("keeps GitHub security/CI notices and direct human requests outside routine-notification exclusions", () => {
  const conversation = taskConversation();
  const message = conversation.evidence.messages[0];
  if (!message) throw new Error("fixture");
  message.from = [{ address: "notifications@github.com" }];
  message.subject = "PR run failed: build";
  expect(taskExclusion(conversation)).toBeUndefined();
  message.from = [{ address: "noreply@github.com" }];
  message.subject = "Security alert";
  expect(taskExclusion(conversation)).toBeUndefined();
  message.from = [{ address: "person@example.com" }];
  message.subject = "Please review (PR #42)";
  expect(taskExclusion(conversation)).toBeUndefined();
});
it("creates only selected proposals and settles each confirmed response", async () => {
  const review = taskReview(["first", "second"]);
  const db = writer();
  const remote = { projects: async () => taskProjects, create: vi.fn(async () => "task-2") };
  const result = await applyEmailTasks(review, [2], taskProjects, db, remote, budget());
  expect(result).toMatchObject([{ candidate: 2, status: "created", taskId: "task-2" }]);
  expect(remote.create).toHaveBeenCalledExactlyOnceWith(review.candidates[1], "request-fixture");
  expect(db.complete).toHaveBeenCalledExactlyOnceWith(
    review.candidates[1],
    "request-fixture",
    "task-2",
  );
});
it("rejects stale evidence, renamed destinations and Retro before reserving writes", async () => {
  const db = writer();
  const remote = { projects: async () => taskProjects, create: vi.fn() };
  const review = taskReview();
  const candidate = review.candidates[0];
  if (!candidate) throw new Error("fixture");
  candidate.title = "An invented action which is not in the source.";
  expect(await applyEmailTasks(review, [1], taskProjects, db, remote, budget())).toMatchObject([
    { status: "stale-or-invalid-proposal" },
  ]);
  candidate.projectName = "Renamed";
  expect(await applyEmailTasks(review, [1], taskProjects, db, remote, budget())).toMatchObject([
    { status: "destination-changed" },
  ]);
  candidate.projectId = "retro";
  candidate.projectName = "Retro";
  expect(await applyEmailTasks(review, [1], taskProjects, db, remote, budget())).toMatchObject([
    { status: "destination-changed" },
  ]);
  expect(
    await applyEmailTasks(taskReview(), [1], taskProjects, db, remote, budget(), "home"),
  ).toMatchObject([{ status: "destination-changed" }]);
  const capturedRetro = taskReview();
  capturedRetro.retroIds.push("home");
  expect(
    await applyEmailTasks(capturedRetro, [1], taskProjects, db, remote, budget()),
  ).toMatchObject([{ status: "destination-changed" }]);
  expect(db.reserve).not.toHaveBeenCalled();
  expect(remote.create).not.toHaveBeenCalled();
});
it.each(["transport", "settlement"])("stops the batch on uncertain %s outcome", async (failure) => {
  const db = writer();
  const create = vi.fn(async () => {
    if (failure === "transport") throw new Error("private-provider-error");
    return "task-created";
  });
  if (failure === "settlement")
    db.complete = vi.fn(async () => {
      throw new Error("private-sql");
    });
  const result = await applyEmailTasks(
    taskReview(["first", "second"]),
    [1, 2],
    taskProjects,
    db,
    { projects: async () => taskProjects, create },
    budget(),
  );
  expect(result).toEqual([{ candidate: 1, status: "ambiguous" }]);
  expect(create).toHaveBeenCalledOnce();
  expect(db.reserve).toHaveBeenCalledOnce();
});
it("apply needs no Jev key or call, and selection/config errors happen before providers", async () => {
  for (const args of [
    ["apply", "file"],
    ["apply", "file", "--approve", "1,1"],
    ["apply", "file", "--approve", "11"],
    ["preview", "--offset", "10001"],
  ])
    expect(() => emailTaskOptions(args)).toThrow();
  const folder = mkdtempSync(join(tmpdir(), "jev-task-test-"));
  try {
    const file = join(folder, "review.json");
    writeFileSync(file, JSON.stringify(taskReview()));
    const db = writer();
    const database = vi.fn(() => ({
      sample: vi.fn(),
      exclusive: async <T>(run: (w: EmailTaskWriter) => Promise<T>) => run(db),
      close: vi.fn(async () => {}),
    }));
    const judge = vi.fn();
    const deps = {
      database,
      remote: () => ({ projects: async () => taskProjects, create: async () => "task" }),
      judge,
    };
    const env = { DB_URL: "postgresql://fake:fake@127.0.0.1:1/fake", TODOIST_API_TOKEN: "fake" };
    await expect(runEmailTasks(["apply", file, "--approve", "2"], env, deps)).rejects.toThrow();
    expect(database).not.toHaveBeenCalled();
    expect(await runEmailTasks(["apply", file, "--approve", "1"], env, deps)).toMatchObject({
      exitCode: 0,
      results: [{ status: "created" }],
    });
    expect(judge).not.toHaveBeenCalled();
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
