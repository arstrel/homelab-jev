import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { connect } from "./client.js";

export async function applyMigrations(client: ReturnType<typeof connect>) {
  await migrate(client.db, {
    migrationsFolder: fileURLToPath(new URL("../../../migrations/", import.meta.url)),
    migrationsSchema: "jev_migrations",
  });
}
