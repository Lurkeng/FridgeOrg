import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Brutalist PWA install prompt — appears when the browser fires `beforeinstallprompt`.
 * Dismissed in-session (no localStorage persistence — respects next-visit re-prompt).
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[150] w-72 border border-[var(--ft-ink)] bg-[var(--ft-paper)] shadow-[4px_4px_0_var(--ft-ink)] animate-scale-in">
      {/* Corner ticks */}
      <span aria-hidden className="absolute top-2 left-2 h-2.5 w-2.5 border-l border-t border-[var(--ft-ink)]" />
      <span aria-hidden className="absolute top-2 right-2 h-2.5 w-2.5 border-r border-t border-[var(--ft-ink)]" />

      <div className="p-4 pr-8">
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--ft-pickle)]">
          Install · Home screen
        </p>
        <p className="mt-1 font-display text-[15px] font-semibold leading-snug text-[var(--ft-ink)]">
          Add FreshTrack to your home screen for the best experience.
        </p>
      </div>

      {/* Dismiss × */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center text-[rgba(21,19,15,0.42)] hover:text-[var(--ft-ink)]"
      >
        <span aria-hidden className="font-mono text-sm">×</span>
      </button>

      <div className="border-t border-[var(--ft-ink)] grid grid-cols-2">
        <button
          onClick={() => setDismissed(true)}
          className="border-r border-[var(--ft-ink)] px-4 py-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[rgba(21,19,15,0.55)] hover:bg-[var(--ft-bone)] transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="px-4 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] bg-[var(--ft-ink)] text-[var(--ft-bone)] hover:bg-[rgba(21,19,15,0.85)] transition-colors"
        >
          Install
        </button>
      </div>
    </div>
  );
}
