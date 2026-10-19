import { jevTriage } from "./adapters/jev-triage.js";
import { connect } from "./adapters/postgres/client.js";
import { triageEvidenceReader } from "./adapters/postgres/mail-triage.js";
import { MailBudget } from "./application/mail-budget.js";
import type { MailTriage, Runtime, TriageEvidenceReader } from "./application/ports.js";
import {
  type TriageOptions,
  triageMail,
  validateTriageOptions,
} from "./application/triage-mail.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

export function triageOptions(args: readonly string[]): TriageOptions {
  const options: TriageOptions = { maxJobs: 5, model: "jev-1.13.0" };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (!flag || seen.has(flag) || !value) throw new ConfigurationError(["mail:classify options"]);
    seen.add(flag);
    if (flag === "--max-jobs" && /^\d+$/.test(value)) options.maxJobs = Number(value);
    else if (flag === "--model" && value === "jev-1.13.0") options.model = value;
    else throw new ConfigurationError(["mail:classify options"]);
  }
  try {
    validateTriageOptions(options);
  } catch {
    throw new ConfigurationError(["mail:classify options"]);
  }
  return options;
}
function database(url: string) {
  const client = connect(url);
  return { reader: triageEvidenceReader(client), close: () => client.close() };
}
export async function runMailTriage(
  args: readonly string[],
  env: Environment,
  deps: {
    database?: (url: string) => { reader: TriageEvidenceReader; close(): Promise<void> };
    triage?: (key: string) => MailTriage;
    clock?: Pick<Runtime, "now">;
    signal?: AbortSignal;
  } = {},
) {
  const options = triageOptions(args);
  const url = databaseUrl(env);
  const key = env.JEV_API_KEY?.trim();
  if (!key) throw new ConfigurationError(["JEV_API_KEY"]);
  if (deps.signal?.aborted) throw new Error("cancelled");
  const db = (deps.database ?? database)(url);
  const budget = new MailBudget({ maxRequests: 20 }, deps.signal);
  try {
    return await triageMail(options, {
      reader: db.reader,
      triage: (deps.triage ?? jevTriage)(key),
      budget,
      clock: deps.clock ?? { now: () => new Date() },
    });
  } finally {
    budget.close();
    await db.close();
  }
}
