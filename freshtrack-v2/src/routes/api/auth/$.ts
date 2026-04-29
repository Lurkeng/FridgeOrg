import { createFileRoute } from "@tanstack/react-router";
import { getAuth } from "@/auth";

/**
 * Catch-all route that forwards every /api/auth/* request to better-auth.
 */

async function handleAuth(request: Request): Promise<Response> {
  try {
    const auth = getAuth();
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
      GET:  ({ request }) => handleAuth(request),
      POST: ({ request }) => handleAuth(request),
    },
  },
});
