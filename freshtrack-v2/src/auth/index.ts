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

    emailAndPassword: {
      enabled: true,

      // Password reset — sends a link to the user's email.
      // In production, wire RESEND_API_KEY + a real email sender here.
      // In dev/staging, the link is logged to the console so you can test without email.
      sendResetPassword: async ({ user, url }) => {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          // Production: send via Resend
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
              from: "FreshTrack <noreply@freshtrack.app>",
              to: user.email,
              subject: "Reset your FreshTrack password",
              html: `<p>Click the link below to reset your password. The link expires in 1 hour.</p><p><a href="${url}">${url}</a></p>`,
            }),
          });
        } else {
          // Dev: log the link so you can test without email configuration
          console.info(`[auth] Password reset link for ${user.email}:\n${url}`);
        }
      },
    },

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
