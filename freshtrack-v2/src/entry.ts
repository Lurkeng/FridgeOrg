/**
 * Custom Cloudflare Worker entry for TanStack Start.
 *
 * The built-in `@tanstack/react-start/server-entry` discards the Cloudflare
 * `env` bindings (D1, secrets, etc.) because it doesn't know about them.
 * This entry captures `env` and injects it into TanStack Start's request
 * context so that server functions and middleware can read it via
 * `(context as { env: Env }).env`.
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return handler(request, { context: { env } as any });
  },
} satisfies ExportedHandler<Env>;
