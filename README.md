# FridgeOrg

FridgeOrg is a household food organizer centered on FreshTrack in `freshtrack-v2/`.

Track fridge/freezer/pantry inventory, reduce waste, share shopping lists with your household, compare Norwegian grocery prices via Kassalapp, and get recipe ideas from your current items (including optional AI suggestions).

## Active app and legacy code

- Active app: `freshtrack-v2/` (TanStack Start app, currently deployed with Vercel + Turso/libSQL).
- Legacy prototype: repository root `src/` and root `package.json` (Next.js). Keep this for reference only.
- New development should target `freshtrack-v2/`.

## Tech stack (active app)

| Layer | Choice |
| --- | --- |
| Framework | [TanStack Start](https://tanstack.com/start) + [React](https://react.dev/) |
| Hosting | [Vercel](https://vercel.com/) |
| Database | [Turso/libSQL](https://turso.tech/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [better-auth](https://www.better-auth.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |

## Quick start

```bash
cd freshtrack-v2
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open `http://localhost:5173`.

For full setup and deployment steps, see `freshtrack-v2/SETUP.md`.

## Repository layout

```text
.
├── freshtrack-v2/          # Active app
│   ├── src/                # Routes, features, components, server functions
│   ├── docs/               # Architecture, onboarding, runbook, QA docs
│   ├── e2e/                # Playwright tests
│   ├── drizzle/            # SQL migrations
│   └── SETUP.md            # Setup + deployment guide
├── src/                    # Legacy Next.js app (not active)
├── MIGRATION_PLAN.md       # Historical migration notes
└── README.md
```

## Core scripts (`freshtrack-v2`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start local dev server |
| `npm run typecheck` | Run TypeScript checks |
| `npm run build` | Build production bundle |
| `npm run test:e2e` | Run Playwright smoke tests |
| `npm run verify` | Typecheck + build + e2e |
| `npm run db:generate` | Generate Drizzle migration SQL |

## Configuration

- Local secrets: `.env` (do not commit real secrets).
- Production secrets: Vercel project environment variables.

Key env vars:
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `KASSALAPP_API_KEY` (optional but required for deals features)
- `ANTHROPIC_API_KEY` (optional, AI recipes)
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

## Documentation map

- `freshtrack-v2/README.md` - app-level overview
- `freshtrack-v2/SETUP.md` - local and production setup
- `freshtrack-v2/docs/ARCHITECTURE.md` - architecture and module boundaries
- `freshtrack-v2/docs/ONBOARDING.md` - first 30 minutes for new contributors
- `freshtrack-v2/docs/RUNBOOK.md` - deploy and incident operations
- `freshtrack-v2/docs/SERVER_FUNCTIONS.md` - server function catalog and guardrails
- `freshtrack-v2/docs/pre-launch/` - launch QA and market artifacts

## Remote repository

[https://github.com/Lurkeng/FridgeOrg](https://github.com/Lurkeng/FridgeOrg)