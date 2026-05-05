import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { AppPreferencesProvider } from "@/lib/app-preferences";
import { InstallPrompt } from "@/components/InstallPrompt";
import appCss from "@/styles/globals.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FreshTrack — Fridge & Freezer Organizer" },
      { name: "description", content: "Norway-first household food tracking for expiry dates, shopping lists, and grocery habits." },
      // Corrected to match actual editorial palette (parchment bone, not legacy orange)
      { name: "theme-color", content: "#f2eadc" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "FreshTrack" },
      // Open Graph
      { property: "og:title", content: "FreshTrack — Fridge & Freezer Organizer" },
      { property: "og:description", content: "Norway-first household food tracking for expiry dates, shopping lists, and grocery habits." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/icons/og-card.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      // Twitter card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FreshTrack — Fridge & Freezer Organizer" },
      { name: "twitter:description", content: "Norway-first household food tracking for expiry dates, shopping lists, and grocery habits." },
      { name: "twitter:image", content: "/icons/og-card.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..500&family=Lora:ital,wght@0,400..700;1,400..600&display=swap" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/freshtrack-icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon-180.png" },
    ],
  }),

  component: RootComponent,
  errorComponent: RootErrorBoundary,
  notFoundComponent: RootNotFound,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <AppPreferencesProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <OfflineBanner />
              <Outlet />
              <InstallPrompt />
            </ToastProvider>
          </QueryClientProvider>
        </AppPreferencesProvider>
        <Scripts />
      </body>
    </html>
  );
}

/** Brutalist editorial error screen — shown when any route throws an unhandled error */
function RootErrorBoundary({ error }: { error: Error }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <title>Something went wrong — FreshTrack</title>
      </head>
      <body className="min-h-screen bg-[#f2eadc] flex items-center justify-center p-6">
        <article className="relative max-w-lg w-full border border-[#15130f] bg-[#fff8e8] p-10 text-center">
          {/* Corner registration ticks */}
          <span aria-hidden className="absolute top-3 left-3 h-3 w-3 border-l border-t border-[#15130f]" />
          <span aria-hidden className="absolute top-3 right-3 h-3 w-3 border-r border-t border-[#15130f]" />
          <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-l border-b border-[#15130f]" />
          <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-r border-b border-[#15130f]" />

          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b8321e] mb-3">
            Stop press · Unexpected error
          </p>
          <h1 className="font-serif text-3xl font-semibold text-[#15130f] mb-3 leading-tight">
            Something went wrong.
          </h1>
          <p className="text-sm text-[rgba(21,19,15,0.65)] mb-6 leading-relaxed">
            FreshTrack hit an unexpected snag. Your data is safe — this is a display error, not a data loss.
          </p>
          {error?.message && (
            <pre className="mb-6 border border-[rgba(21,19,15,0.2)] bg-[rgba(21,19,15,0.04)] px-4 py-3 font-mono text-[10px] text-left text-[rgba(21,19,15,0.72)] overflow-auto">
              {error.message}
            </pre>
          )}
          <a
            href="/"
            className="inline-flex items-center border border-[#15130f] bg-[#15130f] px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#f2eadc] shadow-[3px_3px_0_#b7c167] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#b7c167]"
          >
            Back to dashboard
          </a>
        </article>
        <Scripts />
      </body>
    </html>
  );
}

/** Editorial 404 page */
function RootNotFound() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <title>Page not found — FreshTrack</title>
      </head>
      <body className="min-h-screen bg-[#f2eadc] flex items-center justify-center p-6">
        <article className="relative max-w-lg w-full border border-[#15130f] bg-[#fff8e8] p-10 text-center">
          <span aria-hidden className="absolute top-3 left-3 h-3 w-3 border-l border-t border-[#15130f]" />
          <span aria-hidden className="absolute top-3 right-3 h-3 w-3 border-r border-t border-[#15130f]" />
          <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-l border-b border-[#15130f]" />
          <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-r border-b border-[#15130f]" />

          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#b7c167] mb-3">
            Page · Not found
          </p>
          <h1 className="font-serif text-6xl font-bold text-[#15130f] mb-3 leading-none">
            404
          </h1>
          <p className="font-serif text-xl text-[#15130f] mb-3 leading-tight">
            This page has been eaten.
          </p>
          <p className="text-sm text-[rgba(21,19,15,0.65)] mb-6 leading-relaxed">
            The page you're looking for doesn't exist, was moved, or got consumed before its best-before date.
          </p>
          <a
            href="/"
            className="inline-flex items-center border border-[#15130f] bg-[#15130f] px-6 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#f2eadc] shadow-[3px_3px_0_#b7c167] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#b7c167]"
          >
            Back to dashboard
          </a>
        </article>
        <Scripts />
      </body>
    </html>
  );
}

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="sticky top-0 z-[100] border-b border-[var(--ft-ink)] bg-[var(--ft-signal)] px-4 py-2 text-center text-xs font-semibold text-[var(--ft-bone)]">
      You are offline. FreshTrack will show saved screens, but shopping and inventory updates need a connection.
    </div>
  );
}
