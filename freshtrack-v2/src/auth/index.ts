import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import { users, sessions, accounts, verifications } from "@/db/schema";

/**
 * Create a better-auth instance.
 *
 * All configuration is read from process.env — no Cloudflare bindings needed.
 * Safe to call per-request (drizzle-orm/libsql manages the underlying HTTP connection).
 */
export function getAuth() {
  const db = getDb();

  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user:         users,
        session:      sessions,
        account:      accounts,
        verification: verifications,
      },
    }),
    secret:  process.env.BETTER_AUTH_SECRET ?? "",
    baseURL: process.env.BETTER_AUTH_URL ?? vercelUrl ?? "http://localhost:5173",

    emailAndPassword: { enabled: true },

    session: {
      cookieCache: {
        enabled: true,
        maxAge:  60 * 5, // 5-minute client-side cache
      },
    },

    // Extend the user model with householdId
    user: {
      additionalFields: {
        householdId: { type: "string", required: false },
      },
    },
  });
}

export type Auth = ReturnType<typeof getAuth>;
