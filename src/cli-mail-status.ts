import { connect } from "./adapters/postgres/client.js";
import { mailStatusReader } from "./adapters/postgres/mail-status.js";
import { mailStatus } from "./application/mail-status.js";
import type { MailStatusReader, Runtime } from "./application/ports.js";
import { ConfigurationError, databaseUrl, type Environment } from "./config.js";

function statusDatabase(url: string) {
  const client = connect(url);
  return { reader: mailStatusReader(client), close: () => client.close() };
}
export async function runMailStatus(
  args: readonly string[],
  env: Environment,
  deps: {
    clock?: Pick<Runtime, "now">;
    database?: (url: string) => { reader: MailStatusReader; close(): Promise<void> };
  } = {},
) {
  if (args.length) throw new ConfigurationError(["mail:status options"]);
  const url = databaseUrl(env);
  const database = (deps.database ?? statusDatabase)(url);
  try {
    return await mailStatus(database.reader, deps.clock ?? { now: () => new Date() });
  } finally {
    await database.close();
  }
}
