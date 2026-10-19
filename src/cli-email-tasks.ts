import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { jevEmailTasks } from "./adapters/jev-email-tasks.js";
import { connect } from "./adapters/postgres/client.js";
import { emailTaskDatabase } from "./adapters/postgres/email-tasks.js";
import { todoistEmailTasks } from "./adapters/todoist-email-tasks.js";
import {
  applyEmailTasks,
  type EmailTaskDatabase,
  type EmailTaskRemote,
  previewEmailTasks,
  type TaskJudge,
} from "./application/email-tasks.js";
import { MailBudget } from "./application/mail-budget.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";
import { gmailLink, taskReviewSchema } from "./domain/email-task.js";

export function emailTaskOptions(args: readonly string[]) {
  if (args[0] === "preview") {
    if (args.length === 1) return { mode: "preview" as const, offset: 0 };
    if (
      args.length === 3 &&
      args[1] === "--offset" &&
      /^\d+$/.test(args[2] ?? "") &&
      Number(args[2]) <= 10_000
    )
      return { mode: "preview" as const, offset: Number(args[2]) };
  }
  if (
    args[0] === "apply" &&
    args.length === 4 &&
    args[1] &&
    args[2] === "--approve" &&
    /^[1-9]\d*(?:,[1-9]\d*)*$/.test(args[3] ?? "")
  ) {
    const indices = (args[3] ?? "").split(",").map(Number);
    if (
      indices.length <= 10 &&
      indices.every((n) => n <= 10) &&
      new Set(indices).size === indices.length
    )
      return { mode: "apply" as const, file: args[1], indices };
  }
  throw new ConfigurationError(["mail:tasks preview [--offset 10] | apply <file> --approve 1,3"]);
}
export async function runEmailTasks(
  args: readonly string[],
  env: Environment,
  deps: {
    database?: (url: string) => EmailTaskDatabase;
    remote?: (token: string, signal: AbortSignal) => EmailTaskRemote;
    judge?: (key: string) => TaskJudge;
    save?: (value: unknown) => string;
    signal?: AbortSignal;
  } = {},
) {
  const options = emailTaskOptions(args);
  const review =
    options.mode === "apply"
      ? taskReviewSchema.parse(JSON.parse(readFileSync(options.file, "utf8")))
      : undefined;
  if (review && options.mode === "apply" && options.indices.some((i) => !review.candidates[i - 1]))
    throw new ConfigurationError(["candidate numbers"]);
  const url = databaseUrl(env);
  const token = env.TODOIST_API_TOKEN?.trim();
  if (!token) throw new ConfigurationError(["TODOIST_API_TOKEN"]);
  if (options.mode === "preview" && !env.JEV_API_KEY?.trim())
    throw new ConfigurationError(["JEV_API_KEY"]);
  const db = (deps.database ?? ((url) => emailTaskDatabase(connect(url))))(url);
  const budget = new MailBudget({}, deps.signal);
  try {
    budget.assertActive();
    const remote = (deps.remote ?? todoistEmailTasks)(token, budget.signal);
    const projects = await budget.read(() => remote.projects());
    if (options.mode === "preview") {
      const conversations = await db.sample(options.offset);
      const { review, outcomes } = await previewEmailTasks(
        conversations,
        projects,
        (deps.judge ?? jevEmailTasks)(env.JEV_API_KEY?.trim() ?? ""),
        budget,
        new Date(),
        env.TODOIST_RETRO_PROJECT_ID,
      );
      const save =
        deps.save ??
        ((value) => {
          const folder = resolve(".cache/mail-tasks");
          mkdirSync(folder, { recursive: true, mode: 0o700 });
          const file = resolve(folder, `${randomUUID()}.json`);
          writeFileSync(file, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
          return file;
        });
      const file = save(review);
      return {
        file,
        sampled: conversations.length,
        outcomes,
        candidates: review.candidates.map((c, i) => ({
          candidate: i + 1,
          title: c.title,
          project: c.projectName,
          source: gmailLink(c.sourceId),
        })),
        exitCode: outcomes.some((o) => o.status === "not-proposed") ? 1 : 0,
      };
    }
    if (!review) throw new Error("missing-review");
    const results = await db.exclusive((writer) =>
      applyEmailTasks(
        review,
        options.indices,
        projects,
        writer,
        remote,
        budget,
        env.TODOIST_RETRO_PROJECT_ID,
      ),
    );
    return {
      results: results ?? [],
      overlapping: results === undefined,
      exitCode: results?.some((r) => !["created", "linked", "suppressed"].includes(r.status))
        ? 1
        : 0,
    };
  } finally {
    budget.close();
    await db.close();
  }
}
