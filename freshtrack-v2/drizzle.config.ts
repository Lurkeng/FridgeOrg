import { defineConfig } from "drizzle-kit";

const url       = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

// Use "turso" dialect for remote Turso databases (libsql:// / https://),
// fall back to "sqlite" for local file-based development.
const isRemote = url.startsWith("libsql://") || url.startsWith("https://");

export default defineConfig({
  schema:  "./src/db/schema.ts",
  out:     "./drizzle",
  dialect: isRemote ? "turso" : "sqlite",
  dbCredentials: isRemote
    ? { url, authToken }
    : { url },
});
