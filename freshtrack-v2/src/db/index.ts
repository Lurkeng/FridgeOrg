import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

/**
 * Create a Drizzle database client backed by Turso (libSQL).
 *
 * Local development: set TURSO_DATABASE_URL=file:local.db (no auth token needed)
 * Production (Vercel): set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in project env vars
 */
export function getDb() {
  const url       = process.env.TURSO_DATABASE_URL ?? "file:local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
export { schema };
export { FOOD_CATEGORIES } from "./schema";
