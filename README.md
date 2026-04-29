# FridgeOrg

**FridgeOrg** is a household food organizer centered on **FreshTrack** (the app in `freshtrack-v2/`): track what is in your fridge, freezer, and pantry, reduce waste, plan shopping with **Norwegian grocery price data** via [Kassalapp](https://www.kassal.app/), and get recipe ideas from your inventory (including optional AI suggestions).

This repository also contains a **legacy Next.js** prototype at the repository root (`src/`, root `package.json`) and a **migration plan** toward the Cloudflare stack. **New development should target `freshtrack-v2/`**.

---

## Features

- **Dashboard** — overview of expiring items and quick actions  
- **Inventory** — categories, locations (fridge / freezer / pantry), expiry dates, barcode field  
- **Barcode scan** — camera-based scanning (ZXing) for quick adds  
- **Shopping list** — shared with your household; optional price lookups  
- **Deals and prices** — Kassalapp-backed search, price drops, nearby stores (Norway)  
- **Recipes** — match recipes to what you have; optional AI recipes (Anthropic) when configured  
- **Waste tracker** — log waste and view trends  
- **Households** — invite codes and shared data  
- **Auth** — email/password via [better-auth](https://www.better-auth.com) + sessions

---

## Tech stack (active app)


| Layer     | Choice                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------- |
| Framework | [TanStack Start](https://tanstack.com/start) + [React](https://react.dev/)                                 |
| Hosting   | [Cloudflare Workers](https://workers.cloudflare.com/)                                                      |
| Database  | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth      | [better-auth](https://www.better-auth.com/)                                                                |
| Styling   | [Tailwind CSS](https://tailwindcss.com/)                                                                   |


---

## Repository layout

```
├── freshtrack-v2/          # FreshTrack — primary app (use this)
│   ├── src/                # Routes, components, server functions
│   ├── docs/pre-launch/    # Traceability matrix, QA notes, market notes
│   ├── e2e/                # Playwright smoke tests
│   └── SETUP.md            # Detailed setup and deploy
├── src/                    # Legacy Next.js UI (superseded for new work)
├── MIGRATION_PLAN.md       # Stack migration notes
└── README.md               # This file
```

---

## Quick start

```bash
cd freshtrack-v2
npm install
cp .env.local.example .env.local   # fill in secrets — see SETUP.md
npm run cf-typegen                 # optional: typed Worker bindings
npm run db:migrate:local           # after configuring D1 in wrangler.jsonc
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) (see `[freshtrack-v2/SETUP.md](freshtrack-v2/SETUP.md)` for D1, Wrangler secrets, and production URLs).

---

## Scripts (`freshtrack-v2`)


| Command                                        | Description                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| `npm run dev`                                  | Vite dev server                                    |
| `npm run build`                                | Production client + worker bundle                  |
| `npm run deploy`                               | Deploy to Cloudflare (`wrangler deploy`)           |
| `npm run test:e2e`                             | Playwright smoke (build + preview + `/auth` check) |
| `npm run db:generate`                          | Generate Drizzle migrations                        |
| `npm run db:migrate:local` / `db:migrate:prod` | Apply SQL to D1                                    |


---

## Configuration

- **Local:** `.env.local` and `.dev.vars` (Worker secrets) — **never commit real secrets.**  
- **Production:** `wrangler secret put` for `BETTER_AUTH_SECRET`, optional `ANTHROPIC_API_KEY`, `KASSALAPP_API_KEY`, etc.

Details: `[freshtrack-v2/SETUP.md](freshtrack-v2/SETUP.md)`.

---

## Pre-launch and QA

Structured checklists and competitive notes live under `[freshtrack-v2/docs/pre-launch/](freshtrack-v2/docs/pre-launch/)`.

---

## Contributing

1. Work in `**freshtrack-v2/`** unless you are intentionally touching the legacy app.
2. Run `npm run build` in `freshtrack-v2` before opening a PR.
3. Run `npm run test:e2e` when you change auth or the auth page shell.

---

## License

No license file is included in this repository yet. Add a `LICENSE` file if you intend to open-source or redistribute the code.

---

## Remote

This project is hosted at **[https://github.com/Lurkeng/FridgeOrg](https://github.com/Lurkeng/FridgeOrg)**.