import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { signIn, signUp } from "@/auth/client";
import { useCreateHousehold, useJoinHousehold } from "@/hooks/useHousehold";
import { cn } from "@/lib/utils";
import { Mail, Lock, Home, Hash, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const baseInput =
  "w-full glass rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 " +
  "outline-none focus:ring-2 focus:ring-frost-400/50 focus:bg-white/80 hover:bg-white/75 transition-all";

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-br from-frost-400 to-frost-600 items-center justify-center shadow-glow-frost mb-4 animate-float">
            <span className="text-3xl">🧊</span>
          </div>
          <h1 className="text-3xl font-bold text-gradient-hero">FreshTrack</h1>
          <p className="text-slate-500 mt-2">Track your food, reduce waste, eat better.</p>
        </div>

        <div className="glass-heavy rounded-3xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.10)]">
          {/* Tabs */}
          <div className="flex gap-1 glass rounded-2xl p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); }}
                className={cn("flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all", mode === m ? "glass-heavy text-slate-800 shadow-glass" : "text-slate-500 hover:text-slate-700")}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-50/80 border border-danger-200/60 text-sm text-danger-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={baseInput} autoComplete="email" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={baseInput}
                required
                minLength={mode === "signup" ? 6 : undefined}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "signup" && (
              <div className="glass rounded-2xl p-4 space-y-3 animate-fade-in-down">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Household Setup</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["create", "join"] as const).map((j) => (
                    <button key={j} type="button" onClick={() => setJoinMode(j)}
                      className={cn("py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all",
                        joinMode === j ? "border-frost-400/60 bg-frost-50/80 text-frost-700" : "border-white/30 glass text-slate-500 hover:border-frost-200")}>
                      {j === "create" ? "Create New" : "Join Existing"}
                    </button>
                  ))}
                </div>
                {joinMode === "create" ? (
                  <div className="relative">
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Household name (e.g., The Smiths)" className={baseInput} />
                  </div>
                ) : (
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Enter 6-character invite code" className={baseInput} maxLength={6} />
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-frost-600 to-frost-500 text-white rounded-2xl font-bold text-sm shadow-glow-frost hover:shadow-[0_0_32px_rgba(14,165,233,0.40)] transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/25 text-center">
            <a href="/" className="inline-flex items-center gap-1.5 text-sm text-frost-600 hover:text-frost-800 font-semibold transition-colors">
              Continue without account <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center mt-5">Your data stays private. We never sell your information.</p>
      </div>
    </div>
  );
}
