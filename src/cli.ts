import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { connect } from "./adapters/postgres/client.js";
import { applyMigrations } from "./adapters/postgres/migrate.js";
import { repositories } from "./adapters/postgres/repositories.js";
import { status } from "./application/status.js";
import { databaseUrl, diagnostic } from "./config.js";

const help =
  "Jev preprocessing foundation\nUsage: jev <status|db:check|db:migrate|connections>\n       jev --help | --version\nCycle processing is scheduled for Sections 2–7 and is not yet available.\nLoad credentials explicitly: node --env-file=.env dist/cli.js <command>";
async function main() {
  const [command, ...extra] = process.argv.slice(2);
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
