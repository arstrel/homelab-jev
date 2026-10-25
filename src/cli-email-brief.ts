import { randomUUID } from "node:crypto";
import { driveBrief } from "./adapters/drive-brief.js";
import { googleAuth } from "./adapters/google.js";
import { jevCapture } from "./adapters/jev-capture.js";
import { jevRetro } from "./adapters/jev-retro.js";
import { jevTriage } from "./adapters/jev-triage.js";
import { captureDatabase } from "./adapters/postgres/automatic-capture.js";
import { connect } from "./adapters/postgres/client.js";
import { briefDatabase } from "./adapters/postgres/email-brief.js";
import { mailStatusReader } from "./adapters/postgres/mail-status.js";
import { todoistBrief } from "./adapters/todoist-brief.js";
import { todoistCapture } from "./adapters/todoist-capture.js";
import { todoistRetro } from "./adapters/todoist-retro.js";
import { captureMail } from "./application/capture-mail.js";
import { classifyPendingMail } from "./application/classify-pending-mail.js";
import {
  type BriefOptions,
  publishEmailBrief,
  validateBriefOptions,
} from "./application/email-brief.js";
import { MailBudget } from "./application/mail-budget.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

export function briefOptions(args: readonly string[]): BriefOptions {
  const o: BriefOptions = { maxConversations: 10, days: 7, maxNew: 10 };
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i],
      value = args[i + 1];
    if (flag === "--retro-review" || flag === "--classify-pending" || flag === "--capture-tasks") {
      if (seen.has(flag)) throw new ConfigurationError(["brief:publish options"]);
      seen.add(flag);
      if (flag === "--capture-tasks") o.captureTasks = true;
      else if (flag === "--classify-pending") o.classifyPending = true;
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
  const captureSince = env.JEV_CAPTURE_SINCE?.trim();
  if (
    options.captureTasks &&
    (!todoistToken ||
      !captureSince ||
      !Number.isFinite(Date.parse(captureSince)) ||
      new Date(captureSince).toISOString() !== captureSince ||
      Date.parse(captureSince) > Date.now())
  )
    throw new ConfigurationError(["TODOIST_API_TOKEN", "JEV_CAPTURE_SINCE"]);
  const client = connect(url);
  try {
    const database = briefDatabase(client);
    const status = mailStatusReader(client);
    let capture:
      | Awaited<ReturnType<typeof captureMail>>
      | { failed: number }
      | { overlapping: true }
      | undefined;
    let preprocessing:
      | Awaited<ReturnType<typeof classifyPendingMail>>
      | { overlapping: true }
      | { failed: number }
      | undefined;
    if (options.classifyPending) {
      try {
        preprocessing = (await database.exclusive(async (session, ownership) => {
          const combinedSignal = AbortSignal.any([signal, ownership]);
          combinedSignal.throwIfAborted();
          if ((await status.read(new Date())).schemaState !== "ready")
            throw new Error("schema-not-ready");
          const result = await classifyPendingMail(
            session,
            jevTriage(key ?? ""),
            new Date(),
            combinedSignal,
          );
          if (options.captureTasks && todoistToken && captureSince) {
            const budget = new MailBudget({ maxRequests: 50, deadlineMs: 70_000 }, combinedSignal);
            try {
              capture = (await captureDatabase(client).exclusive((writer) =>
                captureMail(captureSince, {
                  session: writer,
                  allowance: session,
                  remote: todoistCapture(
                    todoistToken,
                    budget,
                    env.TODOIST_RETRO_PROJECT_ID?.trim(),
                  ),
                  judge: jevCapture(key ?? ""),
                  budget,
                  now: new Date(),
                }),
              )) ?? { overlapping: true };
            } catch {
              capture = { failed: 1 };
            } finally {
              budget.close();
            }
          }
          return result;
        })) ?? { overlapping: true };
      } catch {
        preprocessing = { failed: 1 };
      }
    }
    const report = await publishEmailBrief(options, {
      database,
      status,
      ...(capture ? { captureRun: capture } : {}),
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
      ...(capture ? { capture } : {}),
      exitCode:
        report.exitCode ||
        (capture &&
        (("failed" in capture && capture.failed) ||
          ("review" in capture && capture.review) ||
          ("capped" in capture && capture.capped) ||
          ("ambiguous" in capture && capture.ambiguous) ||
          ("budgetExhausted" in capture && capture.budgetExhausted))
          ? 1
          : 0) ||
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
