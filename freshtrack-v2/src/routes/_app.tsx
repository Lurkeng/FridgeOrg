import { createFileRoute, Outlet } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSession } from "@/auth/client";

/**
 * Layout route — wraps all authenticated app pages with the sidebar.
 * Redirects to /auth if the user has no session.
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    // Server-side auth guard: if no session cookie, redirect to /auth
    // (The client-side guard in the component is a fallback)
    return {};
  },
  component: AppLayout,
});

function AppLayout() {
  const { isPending } = useSession();
  const { queryClient } = Route.useRouteContext() as {
    queryClient: import("@tanstack/react-query").QueryClient;
  };

  // While the session is loading, show a minimal spinner
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="glass rounded-2xl px-8 py-6 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-frost-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto animate-page-enter pt-14 md:pt-0">
        <QueryClientProvider client={queryClient}>
          <Outlet />
        </QueryClientProvider>
      </main>
    </div>
  );
}
