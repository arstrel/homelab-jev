import { randomUUID } from "node:crypto";
import { gmailReader } from "./adapters/gmail.js";
import { googleAuth } from "./adapters/google.js";
import { connect } from "./adapters/postgres/client.js";
import { mailEvidenceStore } from "./adapters/postgres/mail-evidence.js";
import { ingestMail } from "./application/ingest-mail.js";
import { MailBudget } from "./application/mail-budget.js";
import type { EvidenceStore, MailReader, Runtime } from "./application/ports.js";
import {
  type PreviewOptions,
  type PreviewResult,
  previewMail,
} from "./application/preview-mail.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

export function mailPreviewOptions(args: readonly string[]): PreviewOptions {
  const result: PreviewOptions = { days: 30, maxThreads: 20 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!flag || !["--days", "--max-threads"].includes(flag) || seen.has(flag))
      throw new ConfigurationError(["mail command options"]);
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

type ReaderFactory = NonNullable<NonNullable<Parameters<typeof runMailPreview>[2]>["reader"]>;
const ingestionDatabase = (url: string) => {
  const client = connect(url);
  return { store: mailEvidenceStore(client), close: () => client.close() };
};
export async function runMailIngest(
  args: readonly string[],
  env: Environment,
  deps: {
    clock?: Runtime;
    reader?: ReaderFactory;
    database?: (url: string) => { store: EvidenceStore; close(): Promise<void> };
    signal?: AbortSignal;
  } = {},
) {
  // Validate all command configuration before constructing either adapter.
  const options = mailPreviewOptions(args);
  const url = databaseUrl(env);
  const auth = googleAuth(env);
  const clock = deps.clock ?? { now: () => new Date(), id: randomUUID };
  const budget = new MailBudget({}, deps.signal);
  let database: ReturnType<typeof ingestionDatabase> | undefined;
  try {
    budget.assertActive();
    database = (deps.database ?? ingestionDatabase)(url);
    const mail = (deps.reader ?? gmailReader)(auth, budget, clock);
    return await ingestMail(options, { mail, store: database.store, clock, budget });
  } finally {
    budget.close();
    await database?.close();
  }
}
