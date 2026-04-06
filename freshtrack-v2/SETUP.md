# FreshTrack v2 — Setup Guide

**Stack:** TanStack Start + Cloudflare Workers + D1 + better-auth + Drizzle ORM

---

## Prerequisites

- Node.js 20+
- Wrangler CLI: `npm install -g wrangler`
- A Cloudflare account (free tier works fine)
- An Anthropic API key (for AI recipes — optional)

---

## 1. Install Dependencies

```bash
cd freshtrack-v2
npm install
```

---

## 2. Create Cloudflare D1 Database

```bash
wrangler d1 create freshtrack-db
```

Copy the `database_id` from the output and paste it into `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "freshtrack-db",
    "database_id": "PASTE_YOUR_ID_HERE"
  }
]
```

---

## 3. Generate & Apply Database Migrations

```bash
# Generate the SQL migration from the Drizzle schema
npm run db:generate

# Apply to local D1 (for development)
npm run db:migrate:local

# Apply to production D1 (when ready to deploy)
npm run db:migrate:prod
```

---

## 4. Configure Environment Variables

Copy `.env.local.example` → `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

```env
BETTER_AUTH_SECRET=your-random-secret-min-32-chars
BETTER_AUTH_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...   # optional, enables AI recipes
VITE_APP_URL=http://localhost:5173
```

For **production**, set secrets via Wrangler (never commit them):
```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put ANTHROPIC_API_KEY
```

---

## 5. Generate Cloudflare Types

```bash
npm run cf-typegen
```

This creates/updates `worker-configuration.d.ts` with typed D1 bindings.

---

## 6. Run Development Server

```bash
npm run dev
```

App runs at http://localhost:5173

---

## 7. Deploy to Cloudflare

```bash
# Build
npm run build

# Deploy
npm run deploy
```

Then update `wrangler.jsonc` and `.env.local`:
```env
BETTER_AUTH_URL=https://freshtrack.YOUR_SUBDOMAIN.workers.dev
VITE_APP_URL=https://freshtrack.YOUR_SUBDOMAIN.workers.dev
```

---

## Project Structure

```
freshtrack-v2/
├── src/
│   ├── auth/              # better-auth server + client config
│   ├── db/                # Drizzle schema + DB helper
│   ├── middleware/        # Auth middleware for server functions
│   ├── server/            # Server functions (createServerFn)
│   │   ├── food-items.ts  # CRUD + waste operations
│   │   ├── waste.ts       # Waste logs + stats
│   │   ├── households.ts  # Household management
│   │   └── recipes.ts     # AI recipe suggestions
│   ├── hooks/             # TanStack Query hooks (data layer)
│   ├── routes/            # File-based routing
│   │   ├── __root.tsx     # HTML shell + providers
│   │   ├── _app.tsx       # Authenticated layout (sidebar)
│   │   ├── _app/          # App pages
│   │   │   ├── index.tsx  # Dashboard
│   │   │   ├── items.tsx  # Food inventory
│   │   │   ├── scan.tsx   # Barcode scanner
│   │   │   ├── recipes.tsx# Classic + AI recipes
│   │   │   └── waste.tsx  # Waste tracker
│   │   ├── auth.tsx       # Login / Sign-up page
│   │   └── api/auth/$.ts  # better-auth catch-all API
│   ├── components/        # UI components (glassmorphism design)
│   ├── lib/               # Utilities + animations
│   ├── types/             # TypeScript types
│   ├── data/              # Recipe data + expiry defaults
│   ├── client.tsx         # Browser entry point
│   ├── ssr.tsx            # Worker SSR entry point
│   └── router.tsx         # TanStack Router setup
├── drizzle/               # Generated SQL migrations (after db:generate)
├── drizzle.config.ts
├── vite.config.ts
├── wrangler.jsonc
├── tailwind.config.ts
└── worker-configuration.d.ts
```

---

## Key Architecture Notes

### Auth (better-auth)
- `getAuth(env)` must be called **per-request** — never at module level
- Session cookies are automatically managed by better-auth
- `authMiddleware` in server functions checks sessions server-side

### Data Flow
```
Browser → TanStack Query hook → createServerFn → Drizzle → D1
```

### AI Recipes
- Uses `claude-haiku-4-5-20251001` via Anthropic REST API
- Prioritises ingredients expiring soonest in the prompt
- Results cached in `sessionStorage` for 30 minutes per inventory hash
- Cost: ~$0.001 per request (10 requests ≈ $0.01)

### routeTree.gen.ts
TanStack Router generates `src/routeTree.gen.ts` automatically on first `npm run dev`.
Do not edit it manually — it is rebuilt whenever you add/rename route files.
