import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/adapters/postgres/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: ["jev"],
  strict: true,
  verbose: true,
});
