# FreshTrack v2 — Setup Guide

## Prerequisites

- Node.js 20+
- npm (bundled with Node)
- Git
- A [Turso](https://turso.tech) account (free tier is fine) — or use a local SQLite file for development

## 1. Clone the repo

```bash
git clone <repo-url>
cd freshtrack-v2
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Then fill in each value:

| Variable | Notes |
|---|---|
| `TURSO_DATABASE_URL` | `file:local.db` for local dev (no token needed) |
| `TURSO_AUTH_TOKEN` | Leave blank when using a local file |
| `BETTER_AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:5173` for local dev |
| `VITE_APP_URL` | Same as `BETTER_AUTH_URL` |
| `KASSALAPP_API_KEY` | Optional — Norwegian grocery pricing |
| `ANTHROPIC_API_KEY` | Optional — AI recipe suggestions |
| `RESEND_API_KEY` | Optional — transactional email (password reset, invites) |

## 4. Set up Turso (skip if using local SQLite)

If you want a remote Turso database:

```bash
# Install Turso CLI if needed: https://docs.turso.tech/cli/installation
turso db create freshtrack
turso db show freshtrack --url      # copy this → TURSO_DATABASE_URL
turso db tokens create freshtrack   # copy this → TURSO_AUTH_TOKEN
```

Set the URL and token in `.env.local`.

## 5. Push the database schema

```bash
npm run db:push
```

This applies the Drizzle schema to your database. For production migrations use `npm run db:generate` + `npm run db:migrate` instead.

## 6. Start the dev server

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

## 7. Sign up

Open the app in your browser and sign up. The first account you create becomes the household owner.

## 8. Verify everything works

1. Open the Dashboard — it should load without errors.
2. Go to **Items** and add a food item with an expiry date.
3. Go to **Shopping** — the shopping list should be accessible.

If all three work, the setup is complete.

---

## Next steps

- Add `KASSALAPP_API_KEY` to enable price comparison on the Shopping page.
- Add `ANTHROPIC_API_KEY` to enable AI recipe suggestions on the Recipes page.
- Deploy to Vercel — see the [README](./README.md#deploy-to-vercel).
