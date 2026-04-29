import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, signUp } from "@/auth/client";
import { useCreateHousehold, useJoinHousehold } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const baseInput =
  "w-full border-0 border-b border-[var(--ft-ink)] bg-transparent px-0 py-3 text-[15px] " +
  "font-medium text-[var(--ft-ink)] outline-none placeholder:text-[rgba(21,19,15,0.42)] " +
  "focus:bg-[var(--ft-paper)]";

const sampleRows = [
  ["Milk", "2 days", "front shelf"],
  ["Spinach", "tonight", "make room"],
  ["Salmon", "freezer", "Friday"],
  ["Bread", "pantry", "toast first"],
];

function AuthPage() {
  const createHousehold = useCreateHousehold();
  const joinHousehold   = useJoinHousehold();

  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [inviteCode, setInviteCode]       = useState("");
  const [joinMode, setJoinMode] = useState<"create" | "join">("create");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter email and password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const result = await signIn.email({ email: trimmedEmail, password });
        if (result.error) {
          console.error("[auth] signIn error:", JSON.stringify(result.error));
          throw new Error(result.error.message ?? result.error.statusText ?? "Sign-in failed");
        }
      } else {
        const result = await signUp.email({
          email: trimmedEmail,
          password,
          name: trimmedEmail.split("@")[0] ?? "User",
        });
        if (result.error) {
          console.error("[auth] signUp error:", JSON.stringify(result.error));
          throw new Error(result.error.message ?? result.error.statusText ?? "Sign-up failed");
        }

        if (joinMode === "create" && householdName.trim()) {
          await createHousehold.mutateAsync({ name: householdName.trim() });
        } else if (joinMode === "join" && inviteCode.trim()) {
          await joinHousehold.mutateAsync({ inviteCode: inviteCode.trim() });
        }
      }

      // Full navigation so the session cookie is picked up reliably (SPA alone can leave
      // better-auth / TanStack Router session state stale).
      window.location.assign("/");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-editorial min-h-screen text-[var(--ft-ink)]">
      <section className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.72fr)]">
        <div className="relative flex min-h-[640px] flex-col justify-between border-r border-[var(--ft-ink)] px-5 py-6 sm:px-8 lg:px-12">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em]">FreshTrack</p>
              <p className="mt-1 max-w-64 text-xs leading-snug text-[rgba(21,19,15,0.62)]">
                Food memory for households that buy with good intent and forget by Thursday.
              </p>
            </div>
            <p className="[writing-mode:vertical-rl] rotate-180 font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-[var(--ft-signal)]">
              Fridge audit no. 04
            </p>
          </div>

          <div className="grid flex-1 content-center gap-10 py-14 lg:grid-cols-[0.78fr_1fr] lg:gap-4">
            <aside className="relative z-10 mt-2 max-w-48 border-t border-[var(--ft-ink)] pt-3 font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-[rgba(21,19,15,0.72)] lg:translate-y-20">
              <span className="block text-[var(--ft-signal)]">Committee veto:</span>
              the table stays ugly enough to be useful.
            </aside>

            <div>
              <h1 className="auth-display max-w-[780px] text-[clamp(4.4rem,11vw,10.8rem)] font-black leading-[0.78] tracking-[-0.075em]">
                Fresh
                <br />
                food has
                <br />
                a short
                <br />
                memory.
              </h1>
              <p className="mt-7 max-w-xl text-[clamp(1rem,1.7vw,1.35rem)] leading-snug text-[rgba(21,19,15,0.74)]">
                FreshTrack turns expiry dates, shopping lists, and household habits into one blunt daily ledger.
              </p>
            </div>
          </div>

          <div className="auth-ledger mb-4 grid border-y border-[var(--ft-ink)] font-mono text-[11px] uppercase tracking-[0.08em] sm:grid-cols-4">
            <div className="border-b border-[var(--ft-ink)] p-3 sm:border-b-0 sm:border-r">11 starter items</div>
            <div className="border-b border-[var(--ft-ink)] p-3 sm:border-b-0 sm:border-r">2 min setup</div>
            <div className="border-b border-[var(--ft-ink)] p-3 sm:border-b-0 sm:border-r">1 household code</div>
            <div className="p-3 text-[var(--ft-signal)]">zero dashboards before breakfast</div>
          </div>
        </div>

        <div className="auth-panel relative flex min-h-[640px] flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute right-0 top-0 hidden h-full w-px bg-[var(--ft-ink)] lg:block" />

          <div className="auth-receipt signature-interaction ml-auto w-full max-w-[460px] border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
            <div className="grid grid-cols-[1fr_auto] border-b border-[var(--ft-ink)] font-mono text-[10px] uppercase tracking-[0.16em]">
              <div className="p-3">Today’s cold case</div>
              <div className="border-l border-[var(--ft-ink)] p-3 text-[var(--ft-signal)]">live</div>
            </div>
            <table className="w-full border-collapse font-mono text-[11px] uppercase tracking-[0.05em]">
              <tbody>
                {sampleRows.map(([name, status, note]) => (
                  <tr key={name} className="border-b border-[rgba(21,19,15,0.22)]">
                    <td className="p-3">{name}</td>
                    <td className="p-3 text-right text-[var(--ft-signal)]">{status}</td>
                    <td className="hidden p-3 text-right text-[rgba(21,19,15,0.58)] sm:table-cell">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="p-3 text-sm leading-snug">
              The signature interaction: focus the form and the receipt turns into tomorrow’s reminder.
            </p>
          </div>

          <div className="mt-10 w-full max-w-[520px] lg:mt-0">
            <div className="mb-8 border-b border-[var(--ft-ink)] pb-5">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--ft-signal)]">
                Private beta
              </p>
              <h2 className="mt-3 text-[clamp(2rem,4vw,4.4rem)] font-black leading-[0.9] tracking-[-0.055em]">
                Start with one shelf.
              </h2>
            </div>

            <div className="mb-5 grid grid-cols-2 border border-[var(--ft-ink)]" role="tablist" aria-label="Authentication mode">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); }}
                  role="tab"
                  aria-selected={mode === m}
                  className={cn(
                    "px-4 py-3 text-left font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                    m === "signup" && "border-l border-[var(--ft-ink)]",
                    mode === m
                      ? "bg-[var(--ft-ink)] text-[var(--ft-bone)]"
                      : "bg-[var(--ft-bone)] text-[var(--ft-ink)] hover:bg-[var(--ft-paper)]",
                  )}
                >
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-5 border border-[var(--ft-signal)] bg-[var(--ft-paper)] p-3 font-mono text-xs uppercase tracking-[0.06em] text-[var(--ft-signal)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="auth-form space-y-5">
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={baseInput} autoComplete="email" required />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="at least 6 characters"
                  className={baseInput}
                  required
                  minLength={mode === "signup" ? 6 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>

              {mode === "signup" && (
                <div className="border border-[var(--ft-ink)] bg-[var(--ft-paper)]">
                  <p className="border-b border-[var(--ft-ink)] p-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Household setup</p>
                  <div className="grid grid-cols-2 border-b border-[var(--ft-ink)]" role="tablist" aria-label="Household setup mode">
                    {(["create", "join"] as const).map((j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setJoinMode(j)}
                        role="tab"
                        aria-selected={joinMode === j}
                        className={cn(
                          "px-3 py-3 text-left font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
                          j === "join" && "border-l border-[var(--ft-ink)]",
                          joinMode === j ? "bg-[var(--ft-pickle)] text-[var(--ft-ink)]" : "bg-[var(--ft-bone)]",
                        )}
                      >
                        {j === "create" ? "Create New" : "Join Existing"}
                      </button>
                    ))}
                  </div>
                  {joinMode === "create" ? (
                    <label className="block p-3">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Household name</span>
                      <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="The Thursday Fridge" className={baseInput} />
                    </label>
                  ) : (
                    <label className="block p-3">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]">Invite code</span>
                      <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="6 characters" className={baseInput} maxLength={6} />
                    </label>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group grid w-full grid-cols-[1fr_auto] border border-[var(--ft-ink)] bg-[var(--ft-signal)] text-left text-[var(--ft-bone)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="px-4 py-4 text-base font-black tracking-[-0.02em]">
                  {loading ? "Checking the shelf" : mode === "login" ? "Log In" : "Create Account"}
                </span>
                <span className="border-l border-[var(--ft-ink)] px-4 py-4 font-mono text-sm transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--ft-ink)] pt-4">
              <p className="max-w-56 text-xs leading-snug text-[rgba(21,19,15,0.62)]">No resale, no household shaming, no mystery sync.</p>
              <a href="/" className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--ft-ink)] underline decoration-[var(--ft-signal)] underline-offset-4">
                Continue without account
              </a>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-[auto_1fr] gap-4 border-t border-[var(--ft-ink)] pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-[rgba(21,19,15,0.64)]">
            <span>Palette</span>
            <span>Bone · Ink · Pickle · Tomato</span>
          </div>
        </div>
      </section>
    </main>
  );
}
