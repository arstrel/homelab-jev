import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  close: vi.fn(async () => {}),
  classify: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  publish: vi.fn<(...args: unknown[]) => Promise<{ published: boolean; exitCode: number }>>(),
}));
vi.mock("../../src/adapters/postgres/client.js", () => ({
  connect: () => ({ close: mocks.close }),
}));
vi.mock("../../src/adapters/postgres/email-brief.js", () => ({
  briefDatabase: () => ({
    exclusive: (run: (session: object, signal: AbortSignal) => Promise<unknown>) =>
      run({}, new AbortController().signal),
  }),
}));
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
  mocks.classify.mockResolvedValue({ classified: 1, failed: 0, budgetExhausted: false });
  mocks.publish.mockResolvedValue({ published: true, exitCode: 0 });
});
it("classifies before publication and retains separate preprocessing counts", async () => {
  const result = await runEmailBrief(args, env, new AbortController().signal);
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
