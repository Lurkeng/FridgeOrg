// App environment — populated from process.env (Node.js / Vercel) at runtime.
// Previously this used Cloudflare Worker bindings; now all vars come from env vars.

interface Env {
  ANTHROPIC_API_KEY:  string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL:    string;
  APP_ENV:            string;
  /** Kassalapp API key — get yours free at https://kassal.app/api */
  KASSALAPP_API_KEY:  string;
}
