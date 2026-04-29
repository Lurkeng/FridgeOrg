/**
 * Server entry for Node.js / Vercel deployments.
 *
 * With the Vercel preset, TanStack Start / Nitro generates a proper
 * serverless handler automatically. This file is kept as a fallback
 * for local `vite preview` (Node.js HTTP server mode).
 */
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

export default createStartHandler(defaultStreamHandler);
