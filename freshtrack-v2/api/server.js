/**
 * Vercel Node.js serverless function — TanStack Start SSR catch-all.
 *
 * Vercel's @vercel/node builder traces this file's imports and packages
 * the entire server bundle (dist/server/**) + all node_modules deps
 * into a single serverless function deployment.
 *
 * Request flow:
 *   Browser → Vercel CDN (static /assets/*) | Vercel Function (everything else)
 *               └──────────────────────────────────────────────────────────────┘
 *                     this handler → TanStack Start SSR → streamed HTML/JSON
 */

import server from "../dist/server/server.js";

export default async function handler(req, res) {
  // Build a full URL — Vercel sets x-forwarded-* for protocol + host
  const proto = (req.headers["x-forwarded-proto"] ?? "https").split(",")[0].trim();
  const host  = (req.headers["x-forwarded-host"]  ?? req.headers["host"] ?? "localhost").split(",")[0].trim();
  const url   = new URL(req.url, `${proto}://${host}`);

  // Buffer request body (required for POST / PUT / PATCH)
  let body = undefined;
  if (!["GET", "HEAD"].includes(req.method ?? "GET")) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length > 0) body = Buffer.concat(chunks);
  }

  // Convert Node IncomingMessage headers to Web API Headers
  // (Node headers can have array values for duplicate header names)
  const webHeaders = new Headers(
    Object.entries(req.headers).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v ?? ""]],
    ),
  );

  // Invoke TanStack Start's Web-standard fetch handler
  const request  = new Request(url.toString(), { method: req.method, headers: webHeaders, body });
  const response = await server.fetch(request);

  // Write status + headers
  res.statusCode = response.status;
  for (const [key, value] of response.headers.entries()) {
    // Skip hop-by-hop headers that Node sets automatically
    if (key === "transfer-encoding" || key === "content-length") continue;
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
