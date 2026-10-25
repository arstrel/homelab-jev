import { randomUUID } from "node:crypto";
import { driveBrief } from "./adapters/drive-brief.js";
import { googleAuth } from "./adapters/google.js";
import { jevRetro } from "./adapters/jev-retro.js";
import { jevTriage } from "./adapters/jev-triage.js";
import { connect } from "./adapters/postgres/client.js";
import { briefDatabase } from "./adapters/postgres/email-brief.js";
import { mailStatusReader } from "./adapters/postgres/mail-status.js";
import { todoistBrief } from "./adapters/todoist-brief.js";
import { todoistRetro } from "./adapters/todoist-retro.js";
import { classifyPendingMail } from "./application/classify-pending-mail.js";
import {
  type BriefOptions,
  publishEmailBrief,
  validateBriefOptions,
} from "./application/email-brief.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

export function briefOptions(args: readonly string[]): BriefOptions {
  const o: BriefOptions = { maxConversations: 10, days: 7, maxNew: 10 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i],
      value = args[i + 1];
    if (flag === "--retro-review" || flag === "--classify-pending") {
      if (seen.has(flag)) throw new ConfigurationError(["brief:publish options"]);
      seen.add(flag);
      if (flag === "--classify-pending") o.classifyPending = true;
      else o.retroReview = true;
      continue;
    }
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
    i++;
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
  const todoistToken = env.TODOIST_API_TOKEN?.trim();
  if ((options.maxNew || options.classifyPending) && !key)
    throw new ConfigurationError(["JEV_API_KEY"]);
  const client = connect(url);
  try {
    const database = briefDatabase(client);
    let preprocessing:
      | Awaited<ReturnType<typeof classifyPendingMail>>
      | { overlapping: true }
      | { failed: number }
      | undefined;
    if (options.classifyPending) {
      try {
        preprocessing = (await database.exclusive((session, ownership) =>
          classifyPendingMail(
            session,
            jevTriage(key ?? ""),
            new Date(),
            AbortSignal.any([signal, ownership]),
          ),
        )) ?? { overlapping: true };
      } catch {
        preprocessing = { failed: 1 };
      }
    }
    const report = await publishEmailBrief(options, {
      database,
      status: mailStatusReader(client),
      triage: jevTriage(key ?? "unused-cached-only"),
      ...(key ? { retroJudge: jevRetro(key) } : {}),
      drive: (budget) => driveBrief(auth, budget),
      ...(todoistToken
        ? {
            todoist: (budget) =>
              todoistBrief(todoistToken, budget, env.TODOIST_RETRO_PROJECT_ID?.trim()),
            retro: (budget) => todoistRetro(todoistToken, budget),
          }
        : {}),
      clock: { now: () => new Date(), id: randomUUID },
      signal,
    });
    return {
      ...report,
      ...(preprocessing ? { preprocessing } : {}),
      exitCode:
        report.exitCode ||
        (preprocessing &&
        (("failed" in preprocessing && preprocessing.failed) ||
          ("budgetExhausted" in preprocessing && preprocessing.budgetExhausted))
          ? 1
          : 0),
    };
  } finally {
    await client.close();
  }
}
