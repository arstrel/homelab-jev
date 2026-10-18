import { randomUUID } from "node:crypto";
import { gmailReader } from "./adapters/gmail.js";
import { googleAuth } from "./adapters/google.js";
import { connect } from "./adapters/postgres/client.js";
import { mailSyncStore } from "./adapters/postgres/mail-sync.js";
import { MailBudget } from "./application/mail-budget.js";
import type { MailSyncReader, MailSyncStore, Runtime } from "./application/ports.js";
import { emptySyncReport, syncMail } from "./application/sync-mail.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";
import { MailReadError } from "./domain/mail-evidence.js";
import type { SyncOptions } from "./domain/mail-sync.js";

export function mailSyncOptions(args: readonly string[]): SyncOptions {
  const options: SyncOptions = { maxPages: 5, maxThreads: 20 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (!flag || !["--days", "--max-pages", "--max-threads"].includes(flag) || seen.has(flag))
      throw new ConfigurationError(["mail:sync options"]);
    seen.add(flag);
    const max = flag === "--days" ? 365 : flag === "--max-pages" ? 20 : 500;
    if (!value || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new ConfigurationError([flag]);
    if (flag === "--days") options.days = Number(value);
    else if (flag === "--max-pages") options.maxPages = Number(value);
    else options.maxThreads = Number(value);
  }
  return options;
}
function syncDatabase(url: string) {
  const client = connect(url);
  return { store: mailSyncStore(client), close: () => client.close() };
}
export async function runMailSync(
  args: readonly string[],
  env: Environment,
  deps: {
    clock?: Runtime;
    reader?: (
      auth: ReturnType<typeof googleAuth>,
      budget: MailBudget,
      clock: Runtime,
    ) => MailSyncReader;
    database?: (url: string) => { store: MailSyncStore; close(): Promise<void> };
    signal?: AbortSignal;
  } = {},
) {
  const options = mailSyncOptions(args);
  const url = databaseUrl(env);
  const auth = googleAuth(env);
  if (deps.signal?.aborted) throw new MailReadError("cancelled");
  const clock = deps.clock ?? { now: () => new Date(), id: randomUUID };
  const database = (deps.database ?? syncDatabase)(url);
  try {
    const result = await database.store.exclusive("primary", async (session) => {
      const signal = deps.signal ? AbortSignal.any([deps.signal, session.signal]) : session.signal;
      const budget = new MailBudget({}, signal);
      try {
        budget.assertActive();
        const mail = (deps.reader ?? gmailReader)(auth, budget, clock);
        return await syncMail(options, { mail, session, budget, clock });
      } finally {
        budget.close();
      }
    });
    if (result) return result;
    return {
      ...emptySyncReport(),
      phase: "skipped" as const,
      reasons: ["overlapping-run" as const],
    };
  } finally {
    await database.close();
  }
}
