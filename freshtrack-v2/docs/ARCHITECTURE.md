# Architecture

## High-level flow

1. Route components in `src/routes` render pages.
2. Routes consume hooks from `src/hooks` and `src/features/*/hooks`.
3. Hooks call server functions in `src/server`.
4. Server functions enforce auth/household scope and access DB via `src/db`.
5. Data is persisted in Turso/libSQL.

## Runtime model

- Frontend and server functions are bundled by TanStack Start.
- Production requests are served through Vercel with `api/server.js`.
- Environment resolution is centralized in `src/lib/env.ts`.

## Auth and authorization

- better-auth API entry is `src/routes/api/auth/$.ts`.
- Server functions use `authMiddleware` (`src/middleware/auth.ts`).
- Household data ownership is resolved through `src/server/household-context.ts`.
- Mutations must scope writes by household.

## Source layout

```text
src/
  auth/                     # better-auth setup
  components/
    layout/                 # app chrome shared across routes
    ui/                     # reusable low-level primitives
  data/                     # static data sets and defaults
  db/                       # schema + DB client
  features/                 # feature-first modules (incremental adoption)
  hooks/                    # shared hooks, legacy and transitional
  lib/                      # generic helpers/utilities
  middleware/               # server middleware
  routes/                   # file-based route definitions
  server/                   # server functions and server helpers
  types/                    # shared TS types
```

## Module boundary rules

- `components/ui`: generic, reusable, no feature logic.
- `components/layout`: shared app shell and page-level frame.
- `features/<feature>`: feature-specific components/hooks/types.
- `routes/*`: thin route composition only; avoid business logic here.
- `server/*`: server function boundaries and domain-level data access.
- `lib/*`: pure helpers that are not feature-specific.

## Data and schema

- DB schema is defined in `src/db/schema.ts`.
- Drizzle client is configured in `src/db/index.ts`.
- Migration config lives in `drizzle.config.ts`.
- Generated migrations are committed under `drizzle/`.

## Deployment

- Build target: Vercel.
- Server entrypoint: `api/server.js`.
- Routing rewrites and output config: `vercel.json`.
- Required env vars are documented in `SETUP.md` and `RUNBOOK.md`.
