import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "@/auth";
import { redirect } from "@tanstack/react-router";
import { getWorkerEnv } from "@/lib/env";

/**
 * Auth middleware for TanStack Start server functions.
 */
export const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  const env  = getWorkerEnv();
  const auth = getAuth();

  const headers = (request as any)?.headers ?? new Headers();

  const session = await auth.api.getSession({ headers });

  if (!session) {
    throw redirect({ to: "/auth" });
  }

  return next({
    context: {
      session,
      userId: session.user.id,
      env,
    },
  });
});
