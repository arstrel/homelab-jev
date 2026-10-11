import { gmailReader } from "./adapters/gmail.js";
import { googleAuth } from "./adapters/google.js";
import { MailBudget } from "./application/mail-budget.js";
import type { MailReader, Runtime } from "./application/ports.js";
import {
  type PreviewOptions,
  type PreviewResult,
  previewMail,
} from "./application/preview-mail.js";
import { ConfigurationError, type Environment } from "./config.js";

export function mailPreviewOptions(args: readonly string[]): PreviewOptions {
  const result: PreviewOptions = { days: 30, maxThreads: 20 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!flag || !["--days", "--max-threads"].includes(flag) || seen.has(flag))
      throw new ConfigurationError(["mail:preview options"]);
    seen.add(flag);
    const max = flag === "--days" ? 365 : 500;
    if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new ConfigurationError([flag]);
    if (flag === "--days") result.days = Number(value);
    else result.maxThreads = Number(value);
  }
  return result;
}

/** Command composition only; application orchestration depends on reader ports. */
export async function runMailPreview(
  args: readonly string[],
  env: Environment,
  deps: {
    clock?: Pick<Runtime, "now">;
    reader?: (
      auth: ReturnType<typeof googleAuth>,
      budget: MailBudget,
      clock: Pick<Runtime, "now">,
    ) => MailReader;
    signal?: AbortSignal;
  } = {},
): Promise<PreviewResult> {
  const options = mailPreviewOptions(args);
  const auth = googleAuth(env);
  const budget = new MailBudget({}, deps.signal);
  const clock = deps.clock ?? { now: () => new Date() };
  try {
    const mail = (deps.reader ?? gmailReader)(auth, budget, clock);
    return await previewMail(options, { mail, budget, clock });
  } finally {
    budget.close();
  }
}
