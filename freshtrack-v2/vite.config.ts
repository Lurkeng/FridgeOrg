import { defineConfig, loadEnv } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Merge `.env` / `.env.local` into Node `process.env` for Vite CLI and any Node-only tooling.
  // Worker secrets are **not** taken from here: use `.dev.vars` locally (Wrangler) and
  // `wrangler secret put` in production — see `.dev.vars.example`.
  const loaded = loadEnv(mode, process.cwd(), "");
  for (const [k, v] of Object.entries(loaded)) {
    if (v !== undefined && process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return {
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tanstackStart({ tsr: { routesDirectory: "src/routes" } }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  };
});
