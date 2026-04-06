import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/auth";
import { getWorkerEnv } from "@/lib/env";

/**
 * Catch-all route that forwards every /api/auth/* request to better-auth.
 * Bindings come from `getWorkerEnv(context)` (custom Worker entry and/or `cloudflare:workers`).
 */

async function handleAuth(request: Request, context: unknown): Promise<Response> {
  try {
    const env = getWorkerEnv(context);
    const auth = getAuth(env);
    const response = await auth.handler(request);

    // Log non-OK responses so we can see what better-auth is returning
    if (!response.ok) {
      const cloned = response.clone();
      try {
        const body = await cloned.text();
        console.error(`[auth] ${request.method} ${new URL(request.url).pathname} → ${response.status}:`, body);
      } catch { /* ignore clone/read errors */ }
    }

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth] handler threw:", message, err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET:  ({ request, context }) => handleAuth(request, context),
      POST: ({ request, context }) => handleAuth(request, context),
    },
  },
});
