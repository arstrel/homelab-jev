import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export function connect(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 4,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  return { pool, db: drizzle(pool, { schema }), close: () => pool.end() };
}
