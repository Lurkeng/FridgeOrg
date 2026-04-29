/**
 * Resolve application environment variables from process.env.
 *
 * Previously this resolved Cloudflare Workers bindings (D1, secrets).
 * Now all configuration comes from standard Node.js process.env, which
 * Vercel populates from the project's Environment Variables settings.
 */
export function getWorkerEnv(_routeContext?: unknown): Env {
  // On Vercel, VERCEL_URL is set automatically for each deployment.
  // Use it as a fallback when BETTER_AUTH_URL isn't explicitly set.
  const vercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : undefined;

  return {
    ANTHROPIC_API_KEY:  process.env.ANTHROPIC_API_KEY  ?? "",
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "",
    BETTER_AUTH_URL:    process.env.BETTER_AUTH_URL    ?? vercelUrl ?? "http://localhost:5173",
    APP_ENV:            process.env.APP_ENV            ?? process.env.NODE_ENV ?? "development",
    KASSALAPP_API_KEY:  process.env.KASSALAPP_API_KEY  ?? "",
  };
}

// Alias kept for any existing import sites
export function getCloudflareEnv(): Env {
  return getWorkerEnv();
}
