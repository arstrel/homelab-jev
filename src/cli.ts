import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "./adapters/postgres/client.js";
import { applyMigrations } from "./adapters/postgres/migrate.js";
import { repositories } from "./adapters/postgres/repositories.js";
import { status } from "./application/status.js";
import { databaseUrl, diagnostic } from "./config.js";

const help =
  "Jev preprocessing\nUsage: jev <status|db:check|db:migrate|connections>\n       jev mail:status\n       jev mail:preview [--days 30] [--max-threads 20]\n       jev mail:ingest [--days 30] [--max-threads 20]\n       jev mail:sync [--days 30] [--max-pages 5] [--max-threads 20]\n       jev mail:classify [--max-jobs 5] [--model jev-1.13.0]\n       jev --help | --version\nCycle processing is scheduled for Sections 2–7 and is not yet available.\nLoad credentials explicitly: node --env-file=.env dist/cli.js <command>";
async function main() {
  const [command, ...extra] = process.argv.slice(2);
  if (command === "mail:status") {
    const { runMailStatus } = await import("./cli-mail-status.js");
    const report = await runMailStatus(extra, process.env);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.exitCode;
    return;
  }
  if (
    command === "mail:preview" ||
    command === "mail:ingest" ||
    command === "mail:sync" ||
    command === "mail:classify"
  ) {
    const { runMailPreview, runMailIngest } = await import("./cli-mail.js");
    const controller = new AbortController();
    let signalExit: number | undefined;
    const interrupt = () => {
      signalExit = 130;
      controller.abort();
    };
    const terminate = () => {
      signalExit = 143;
      controller.abort();
    };
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", terminate);
    try {
      const report =
        command === "mail:classify"
          ? await (await import("./cli-mail-triage.js")).runMailTriage(extra, process.env, {
              signal: controller.signal,
            })
          : command === "mail:sync"
            ? await (await import("./cli-mail-sync.js")).runMailSync(extra, process.env, {
                signal: controller.signal,
              })
            : command === "mail:ingest"
              ? await runMailIngest(extra, process.env, { signal: controller.signal })
              : (await runMailPreview(extra, process.env, { signal: controller.signal })).report;
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = signalExit ?? report.exitCode;
    } finally {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
    }
    return;
  }
  if (extra.length) throw new Error("Unexpected arguments");
  if (!command || command === "--help") {
    console.log(help);
    return;
  }
  if (command === "--version") {
    console.log(
      JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version,
    );
    return;
  }
  if (command === "connections") {
    const { checkConnections } = await import("./adapters/connections.js");
    await checkConnections(process.env);
    return;
  }
  if (!["status", "db:check", "db:migrate"].includes(command)) {
    console.error(help);
    process.exitCode = 1;
    return;
  }
  const client = connect(databaseUrl(process.env));
  try {
    if (command === "db:migrate") {
      await applyMigrations(client);
      console.log("Reviewed Jev migrations applied.");
    } else if (command === "db:check") {
      await client.pool.query("select 1");
      console.log("PostgreSQL connection verified (read-only).");
    } else
      console.log(
        JSON.stringify(
          await status(repositories(client), { now: () => new Date(), id: randomUUID }),
        ),
      );
  } finally {
    await client.close();
  }
}
main().catch((error: unknown) => {
  console.error(diagnostic(error));
  process.exitCode = 1;
});
