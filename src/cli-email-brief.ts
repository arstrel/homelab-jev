import { randomUUID } from "node:crypto";
import { driveBrief } from "./adapters/drive-brief.js";
import { googleAuth } from "./adapters/google.js";
import { jevTriage } from "./adapters/jev-triage.js";
import { connect } from "./adapters/postgres/client.js";
import { briefDatabase } from "./adapters/postgres/email-brief.js";
import { mailStatusReader } from "./adapters/postgres/mail-status.js";
import {
  type BriefOptions,
  publishEmailBrief,
  validateBriefOptions,
} from "./application/email-brief.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

export function briefOptions(args: readonly string[]): BriefOptions {
  const o: BriefOptions = { maxConversations: 10, days: 7, maxNew: 10 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i],
      value = args[i + 1];
    if (
      !flag ||
      !["--max-conversations", "--days", "--max-new"].includes(flag) ||
      seen.has(flag) ||
      !value ||
      !/^\d+$/.test(value)
    )
      throw new ConfigurationError(["brief:publish options"]);
    seen.add(flag);
    if (flag === "--days") o.days = Number(value);
    else if (flag === "--max-new") o.maxNew = Number(value);
    else o.maxConversations = Number(value);
  }
  try {
    validateBriefOptions(o);
  } catch {
    throw new ConfigurationError(["brief:publish options"]);
  }
  return o;
}
export async function runEmailBrief(
  args: readonly string[],
  env: Environment,
  signal: AbortSignal,
) {
  const options = briefOptions(args);
  const url = databaseUrl(env);
  const auth = googleAuth(env);
  const key = env.JEV_API_KEY?.trim();
  if (options.maxNew && !key) throw new ConfigurationError(["JEV_API_KEY"]);
  const client = connect(url);
  try {
    return await publishEmailBrief(options, {
      database: briefDatabase(client),
      status: mailStatusReader(client),
      triage: jevTriage(key ?? "unused-cached-only"),
      drive: (budget) => driveBrief(auth, budget),
      clock: { now: () => new Date(), id: randomUUID },
      signal,
    });
  } finally {
    await client.close();
  }
}
