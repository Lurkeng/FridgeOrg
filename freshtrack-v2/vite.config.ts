import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

function loadDevVars() {
  const filePath = path.resolve(process.cwd(), ".dev.vars");
  if (!fs.existsSync(filePath)) return {};

  return Object.fromEntries(
    fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [key, valueParts.join("=")];
      }),
  );
}

export default defineConfig(({ mode }) => {
  // Merge local env files into process.env for Vite CLI and server functions.
  // Vite handles .env/.env.local; .dev.vars is kept for local Worker-era secrets.
  const loaded = { ...loadDevVars(), ...loadEnv(mode, process.cwd(), "") };
  for (const [k, v] of Object.entries(loaded)) {
    if (v !== undefined && process.env[k] === undefined) {
      process.env[k] = v;
    }
  }

  return {
    plugins: [
      tanstackStart({
        tsr: { routesDirectory: "src/routes" },
      }),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        // Use "dist/client" as the web root so the SW is served from "/"
        outDir: "dist/client",
        // Don't inject service worker script into SSR HTML — we handle it ourselves
        injectManifest: false,
        workbox: {
          globDirectory: "dist/client",
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
          // Ignore SSR assets — only cache client-side files
          globIgnores: ["**/server/**"],
          navigateFallback: null,
          runtimeCaching: [
            {
              // Shopping list API: network-first, 24-hour stale fallback
              urlPattern: /\/api\/shopping-list/,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-shopping",
                networkTimeoutSeconds: 5,
                expiration: { maxAgeSeconds: 86400, maxEntries: 10 },
              },
            },
            {
              // Google Fonts: stale-while-revalidate, long cache
              urlPattern: /fonts\.googleapis\.com|fonts\.gstatic\.com/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts",
                expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
        manifest: {
          name: "FreshTrack",
          short_name: "FreshTrack",
          description: "A Norway-first household food tracker for expiry dates, shopping lists, and grocery habits.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#fff8e8",
          theme_color: "#f2eadc",
          icons: [
            { src: "/icons/freshtrack-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: "/icons/freshtrack-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
          ],
        },
      }),
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
              return "vendor-react";
            }
            if (id.includes("node_modules/@tanstack/react-query")) {
              return "vendor-query";
            }
            if (
              id.includes("node_modules/@tanstack/react-router") ||
              id.includes("node_modules/@tanstack/react-start")
            ) {
              return "vendor-router";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "vendor-lucide";
            }
            if (id.includes("node_modules/recharts")) {
              return "vendor-recharts";
            }
          },
        },
      },
    },
  };
});
