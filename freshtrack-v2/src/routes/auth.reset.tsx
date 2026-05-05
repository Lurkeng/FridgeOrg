import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/auth/reset")({
  component: PasswordResetPage,
});

const baseInput =
  "w-full border-0 border-b border-[var(--ft-ink)] bg-transparent px-0 py-3 text-[15px] " +
  "font-medium text-[var(--ft-ink)] outline-none placeholder:text-[rgba(21,19,15,0.42)] " +
  "focus:bg-[var(--ft-paper)]";

function PasswordResetPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    try {
      // POST to the better-auth reset endpoint directly.
      // The passwordReset plugin must be enabled in src/auth/index.ts for this to work.
      const res = await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, redirectTo: `${window.location.origin}/auth` }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "Request failed");
      }
      setSent(true);
    } catch (err) {
      console.error("[auth] forget-password error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-editorial min-h-screen text-[var(--ft-ink)] flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 border-b border-[var(--ft-ink)] pb-5">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">
            FreshTrack
          </p>
          <h1 className="mt-3 font-display text-3xl font-black leading-[0.9] tracking-[-0.055em]">
            Reset your password.
          </h1>
        </div>

        {sent ? (
          <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--ft-pickle)] mb-3">
              Email sent
            </p>
            <p className="text-sm leading-relaxed text-[rgba(21,19,15,0.74)]">
              Check your email for a reset link.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-5 border border-[var(--ft-signal)] bg-[var(--ft-paper)] p-3 font-mono text-xs uppercase tracking-[0.06em] text-[var(--ft-signal)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={baseInput}
                  autoComplete="email"
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group grid w-full grid-cols-[1fr_auto] border border-[var(--ft-ink)] bg-[var(--ft-ink)] text-left text-[var(--ft-bone)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.20em]">
                  {loading ? "Sending…" : "Send reset link"}
                </span>
                <span className="border-l border-[var(--ft-ink)] px-4 py-4 font-mono text-sm transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-[var(--ft-ink)] pt-4">
          <Link
            to="/auth"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ft-pickle)] hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
