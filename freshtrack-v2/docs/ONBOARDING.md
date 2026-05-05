# Onboarding

## First 30 minutes

1. Clone repo and open `freshtrack-v2`.
2. Install dependencies.
3. Configure `.env`.
4. Start local dev server.
5. Run verification commands.
6. Read architecture and server docs.
7. Make a tiny safe change and verify.

## Setup commands

```bash
cd freshtrack-v2
npm install
cp .env.example .env
npm run dev
```

## Verification commands

```bash
npm run typecheck
npm run build
npm run test:e2e
```

## What to read next

- `docs/ARCHITECTURE.md`
- `docs/SERVER_FUNCTIONS.md`
- `docs/CONTRIBUTING.md`

## Safe first tasks

- Update text copy in a route page.
- Replace duplicated route-level button markup with `components/ui/Button`.
- Add a tiny non-breaking doc clarification.

## Common gotchas

- Do not edit `src/routeTree.gen.ts` manually.
- Keep secrets in `.env` and Vercel project variables.
- Server mutations must be household-scoped.
