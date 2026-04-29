/**
 * Post-build script: transforms TanStack Start's dist/ output into
 * Vercel Build Output API v3 format (.vercel/output/).
 *
 * TanStack Start produces:
 *   dist/client/   → static assets (JS, CSS, images)
 *   dist/server/   → SSR server bundle (Node.js)
 *
 * Vercel expects:
 *   .vercel/output/
 *     config.json                        → routing rules
 *     static/                            → served from CDN
 *     functions/__index.func/            → serverless function (catch-all)
 *       index.js                         → Node.js handler entry
 *       .vc-config.json                  → function runtime config
 *       ... (server bundle assets)
 */

import { mkdir, cp, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

const ROOT        = process.cwd();
const DIST_CLIENT = `${ROOT}/dist/client`;
const DIST_SERVER = `${ROOT}/dist/server`;
const OUTPUT      = `${ROOT}/.vercel/output`;

async function main() {
  // Clean previous output
  if (existsSync(OUTPUT)) {
    await rm(OUTPUT, { recursive: true });
  }

  // Create directory structure
  await mkdir(`${OUTPUT}/static`,                            { recursive: true });
  await mkdir(`${OUTPUT}/functions/__index.func`,            { recursive: true });

  // 1. Static assets → CDN
  console.log("  Copying static assets…");
  await cp(DIST_CLIENT, `${OUTPUT}/static`, { recursive: true });

  // 2. Server bundle → serverless function
  console.log("  Copying server bundle…");
  await cp(DIST_SERVER, `${OUTPUT}/functions/__index.func`, { recursive: true });

  // 3. Function entrypoint — adapts Web API Request/Response to Node.js
  await writeFile(`${OUTPUT}/functions/__index.func/index.js`, `
// Vercel Node.js serverless function entrypoint for TanStack Start SSR.
// Adapts the Web-standard fetch handler to Node.js IncomingMessage/ServerResponse.
import server from "./server.js";

export default async function handler(req, res) {
  // Build full URL (Vercel sets x-forwarded headers)
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"]  || req.headers["host"] || "localhost";
  const url   = new URL(req.url, \`\${proto}://\${host}\`);

  // Buffer request body (except for bodyless methods)
  let body = undefined;
  if (!["GET", "HEAD"].includes(req.method ?? "GET")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  // Build Web API Request
  // Node.js headers can be arrays — Headers constructor handles that
  const request = new Request(url.toString(), {
    method:  req.method,
    headers: new Headers(
      Object.entries(req.headers).flatMap(([k, v]) =>
        Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v ?? ""]]
      )
    ),
    body,
  });

  // Call TanStack Start SSR handler
  const response = await server.fetch(request);

  // Write response status + headers
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    // Skip headers that Node.js sets automatically
    if (key.toLowerCase() === "transfer-encoding") continue;
    res.setHeader(key, value);
  }

  // Stream response body
  if (response.body) {
    const reader = response.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  res.end();
}
`.trimStart());

  // 4. Function runtime config
  await writeFile(`${OUTPUT}/functions/__index.func/.vc-config.json`, JSON.stringify({
    runtime:    "nodejs20.x",
    handler:    "index.js",
    maxDuration: 30,
  }, null, 2));

  // 5. Vercel routing config:
  //   • Serve static assets directly from CDN
  //   • All other requests → SSR serverless function
  await writeFile(`${OUTPUT}/config.json`, JSON.stringify({
    version: 3,
    routes: [
      // Rewrite /_build/* → static (TanStack Start's Vite asset prefix)
      { src: "/_build/(.*)", dest: "/$1" },
      // Serve already-hashed static files with long cache
      {
        src: "/assets/.*",
        headers: { "Cache-Control": "public, max-age=31536000, immutable" },
        continue: true,
      },
      // Let Vercel handle filesystem (static files in .vercel/output/static/)
      { handle: "filesystem" },
      // Everything else → SSR
      { src: "/(.*)", dest: "/" },
    ],
  }, null, 2));

  console.log("✓  .vercel/output/ ready for deployment");
}

main().catch((err) => {
  console.error("✗  vercel-output.mjs failed:", err);
  process.exit(1);
});
