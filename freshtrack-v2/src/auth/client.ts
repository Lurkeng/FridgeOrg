import { createAuthClient } from "better-auth/react";

/**
 * Must match the page origin (including port). A fixed `localhost:5173` breaks when Vite
 * uses another port — the browser then fetches the wrong host and shows "Load failed".
 * Empty string is falsy in better-auth's resolver and would fall through to env — always a non-empty string.
 */
function authBaseURL(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  const fromEnv = import.meta.env.VITE_APP_URL;
  return (fromEnv && String(fromEnv).length > 0 ? String(fromEnv) : null) ?? "http://localhost:5173";
}

export const authClient = createAuthClient({
  baseURL: authBaseURL(),
  sessionOptions: {
    // Disable refetch on window focus — prevents annoying flash/reload when
    // switching tabs or returning to the app. The session is still fetched on
    // initial load and after sign-in/sign-out.
    refetchOnWindowFocus: false,
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;
