import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
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
    ],
    resolve: {
      alias: { "@": path.resolve(__dirname, "src") },
    },
  };
});
