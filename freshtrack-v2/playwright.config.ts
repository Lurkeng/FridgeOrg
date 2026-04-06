import { defineConfig, devices } from "@playwright/test";

/**
 * Minimal smoke tests. Starts Vite dev server unless one is already running locally.
 * CI: set CI=1 to avoid reusing a stale server.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  /* Preview is slower to start than dev but returns 200 reliably for the health check. */
  webServer: {
    command: "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
