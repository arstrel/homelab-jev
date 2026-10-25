import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  close: vi.fn(async () => {}),
  held: false,
  capture: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  readiness: vi.fn<(...args: unknown[]) => Promise<{ schemaState: string }>>(),
  classify: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  publish: vi.fn<(...args: unknown[]) => Promise<{ published: boolean; exitCode: number }>>(),
}));
vi.mock("../../src/adapters/postgres/client.js", () => ({
  connect: () => ({ close: mocks.close }),
}));
vi.mock("../../src/adapters/postgres/email-brief.js", () => ({
  briefDatabase: () => ({
    exclusive: async (run: (session: object, signal: AbortSignal) => Promise<unknown>) => {
      mocks.held = true;
      try {
        return await run({}, new AbortController().signal);
      } finally {
        mocks.held = false;
      }
    },
  }),
}));
vi.mock("../../src/adapters/postgres/mail-status.js", () => ({
  mailStatusReader: () => ({ read: mocks.readiness }),
}));
vi.mock("../../src/adapters/postgres/automatic-capture.js", () => ({
  captureDatabase: () => ({ exclusive: (run: (session: object) => Promise<unknown>) => run({}) }),
}));
vi.mock("../../src/application/capture-mail.js", () => ({ captureMail: mocks.capture }));
vi.mock("../../src/application/classify-pending-mail.js", () => ({
  classifyPendingMail: mocks.classify,
}));
vi.mock("../../src/application/email-brief.js", async (original) => ({
  ...(await original<object>()),
  publishEmailBrief: mocks.publish,
}));

import { runEmailBrief } from "../../src/cli-email-brief.js";

const env = {
  DB_URL: "postgresql://fake:fake@localhost/fake",
  GOOGLE_CLIENT_ID: "fake",
  GOOGLE_CLIENT_SECRET: "fake",
  GOOGLE_REFRESH_TOKEN: "fake",
  JEV_API_KEY: "fake",
};
const args = ["--max-new", "0", "--classify-pending"];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.held = false;
  mocks.readiness.mockImplementation(async () => {
    expect(mocks.held).toBe(true);
    return { schemaState: "ready" };
  });
  mocks.capture.mockResolvedValue({ created: 1, matched: 0, failed: 0, review: 0 });
  mocks.classify.mockResolvedValue({ classified: 1, failed: 0, budgetExhausted: false });
  mocks.publish.mockResolvedValue({ published: true, exitCode: 0 });
});
it("classifies before publication and retains separate preprocessing counts", async () => {
  const result = await runEmailBrief(args, env, new AbortController().signal);
  expect(mocks.readiness).toHaveBeenCalledBefore(mocks.classify);
  expect(mocks.classify).toHaveBeenCalledBefore(mocks.publish);
  expect(result).toMatchObject({ published: true, exitCode: 0, preprocessing: { classified: 1 } });
  expect(mocks.close).toHaveBeenCalledOnce();
});
it("still publishes cached context after allowance exhaustion or preprocessing failure", async () => {
  mocks.classify.mockResolvedValueOnce({ failed: 0, budgetExhausted: true });
  expect(await runEmailBrief(args, env, new AbortController().signal)).toMatchObject({
    published: true,
    exitCode: 1,
    preprocessing: { budgetExhausted: true },
  });
  mocks.classify.mockRejectedValueOnce(new Error("private database details"));
  const result = await runEmailBrief(args, env, new AbortController().signal);
  expect(result).toMatchObject({ published: true, exitCode: 1, preprocessing: { failed: 1 } });
  expect(JSON.stringify(result)).not.toContain("private database details");
  expect(mocks.publish).toHaveBeenCalledTimes(2);
});
it("cached-only refresh does not invoke preprocessing", async () => {
  await runEmailBrief(["--max-new", "0"], env, new AbortController().signal);
  expect(mocks.classify).not.toHaveBeenCalled();
  expect(mocks.publish).toHaveBeenCalledOnce();
});

it.each(["migration-required", "incompatible", "unavailable"])(
  "does not start preprocessing against %s storage",
  async (schemaState) => {
    mocks.readiness.mockImplementationOnce(async () => {
      expect(mocks.held).toBe(true);
      return { schemaState };
    });
    expect(await runEmailBrief(args, env, new AbortController().signal)).toMatchObject({
      preprocessing: { failed: 1 },
      exitCode: 1,
    });
    expect(mocks.classify).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledOnce();
  },
);
it("does not start preprocessing when readiness cannot be read", async () => {
  mocks.readiness.mockRejectedValueOnce(new Error("private connection details"));
  expect(await runEmailBrief(args, env, new AbortController().signal)).toMatchObject({
    preprocessing: { failed: 1 },
    exitCode: 1,
  });
  expect(mocks.classify).not.toHaveBeenCalled();
});

it("runs opt-in capture under the shared ready publisher ownership before publication", async () => {
  await runEmailBrief(
    [...args, "--capture-tasks"],
    { ...env, TODOIST_API_TOKEN: "fake", JEV_CAPTURE_SINCE: "2026-10-01T00:00:00.000Z" },
    new AbortController().signal,
  );
  expect(mocks.classify).toHaveBeenCalledBefore(mocks.capture);
  expect(mocks.capture).toHaveBeenCalledBefore(mocks.publish);
  expect(mocks.publish).toHaveBeenCalled();
});
it("requires a valid explicit capture boundary and token before connecting", async () => {
  await expect(
    runEmailBrief([...args, "--capture-tasks"], env, new AbortController().signal),
  ).rejects.toThrow("JEV_CAPTURE_SINCE");
  expect(mocks.capture).not.toHaveBeenCalled();
});
