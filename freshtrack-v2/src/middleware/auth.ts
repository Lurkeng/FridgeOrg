import { createMiddleware } from "@tanstack/react-start";
import { getAuth } from "@/auth";
import { redirect } from "@tanstack/react-router";
import { getWorkerEnv } from "@/lib/env";

/**
 * Auth middleware for TanStack Start server functions.
 */
export const authMiddleware = createMiddleware().server(async ({ next, request, context }) => {
  const env = getWorkerEnv(context);
  const auth = getAuth(env);

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

// Optional: household-aware middleware (adds householdId to context)
export const householdMiddleware = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    // householdId is stored on the user record via better-auth additional fields
    const householdId = (context.session.user as { householdId?: string }).householdId;
    return next({ context: { ...context, householdId } });
  });
