import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/db";
import { users, sessions, accounts, verifications } from "@/db/schema";

/**
 * IMPORTANT: Call getAuth() per-request, never at module load time.
 * D1 bindings are only available inside Cloudflare Workers request handlers.
 */
export function getAuth(env: Env) {
  const db = getDb(env.DB);

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
    secret:   env.BETTER_AUTH_SECRET,
    baseURL:  env.BETTER_AUTH_URL || "http://localhost:5173",

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
