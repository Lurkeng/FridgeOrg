import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { Sidebar } from "@/components/layout/Sidebar";
import { useSession } from "@/auth/client";

/**
 * Layout route — wraps all authenticated app pages with the sidebar.
 * Redirects to /auth if the user has no session.
 */
export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { data: session, isPending } = useSession();

  // While the session is loading, show a minimal spinner
  if (isPending) {
    return (
      <div className="dashboard-editorial flex min-h-screen items-center justify-center">
        <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] px-8 py-6 font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
          <span className="inline-block h-3 w-3 animate-pulse border border-[var(--ft-signal)] bg-[var(--ft-signal)] align-[-1px]" /> Loading pantry ledger…
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="dashboard-editorial flex h-screen overflow-hidden">
      {/* Skip-to-content link — keyboard/screen-reader shortcut, visually hidden until focused */}
      <a
        href="#main-content"
        className="absolute left-2 top-2 z-[200] -translate-y-16 bg-[var(--ft-ink)] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-[var(--ft-bone)] transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar />
      <main id="main-content" className="dashboard-scroll flex-1 overflow-y-auto animate-page-enter pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
