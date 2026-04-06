import { env as cfEnv } from "cloudflare:workers";

function mergeProcessIntoEnv(raw: Env): Env {
  // Optional Node `process.env` (e.g. some tooling); Workers get secrets from `raw` via
  // `.dev.vars` (local) or `wrangler secret put` (production).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p =
    typeof (globalThis as any).process !== "undefined"
      ? ((globalThis as any).process.env as Record<string, string | undefined>)
      : undefined;
  return {
    ...raw,
    ANTHROPIC_API_KEY: raw.ANTHROPIC_API_KEY || p?.ANTHROPIC_API_KEY || "",
    BETTER_AUTH_SECRET: raw.BETTER_AUTH_SECRET || p?.BETTER_AUTH_SECRET || "",
    BETTER_AUTH_URL: raw.BETTER_AUTH_URL || p?.BETTER_AUTH_URL || "",
    KASSALAPP_API_KEY: raw.KASSALAPP_API_KEY || p?.KASSALAPP_API_KEY || "",
  };
}

function envFromLegacyGlobals(): Env | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (globalThis as any).__cf_env;
    if (mod) return mod as Env;
  } catch {
    /* ignore */
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any).__env as Env | undefined;
}

/**
 * Resolve Cloudflare bindings for server code (API routes, server functions, middleware).
 *
 * Order: TanStack `context.env` from a custom Worker entry (if present), then
 * `cloudflare:workers` `env` (correct for Vite + Miniflare and production Workers
 * even when the default TanStack server entry does not pass `context`), then legacy
 * globals used by older tooling.
 */
export function getWorkerEnv(routeContext?: unknown): Env {
  const ctx = routeContext as { env?: Env } | undefined;
  if (ctx?.env?.DB) {
    return mergeProcessIntoEnv(ctx.env);
  }

  const fromModule = cfEnv as unknown as Env;
  if (fromModule?.DB) {
    return mergeProcessIntoEnv(fromModule);
  }

  const legacy = envFromLegacyGlobals();
  if (legacy?.DB) {
    return mergeProcessIntoEnv(legacy);
  }

  throw new Error(
    "Cloudflare bindings unavailable (no D1). Use the Cloudflare Vite plugin, set wrangler `main`, and add `.dev.vars` (local) or deploy with secrets.",
  );
}

export function getCloudflareEnv(): Env {
  return getWorkerEnv();
}
