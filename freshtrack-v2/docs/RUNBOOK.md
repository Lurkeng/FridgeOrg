# Runbook

## Deploy checklist

1. `npm run typecheck`
2. `npm run build`
3. `npm run test:e2e`
4. Confirm required env vars are set in Vercel.
5. Deploy and run smoke checks.
6. Run mobile/PWA smoke checks on a real phone or browser device emulation.

## Required production env vars

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `APP_ENV=production`
- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Optional:
- `KASSALAPP_API_KEY`
- `ANTHROPIC_API_KEY`

## Migration procedure

1. Update `src/db/schema.ts`.
2. Generate migration: `npm run db:generate`.
3. Commit migration SQL in `drizzle/`.
4. Deploy with updated Turso settings.

## Smoke checks after deploy

- `/auth` loads login UI
- unauthenticated access to `/items` redirects to `/auth`
- authenticated user can load `/items`
- shopping list loads without server errors
- `/settings` renders reminder preferences for an authenticated household
- `/shopping` mobile view exposes Store mode, Paste List, and Put Away flows
- checked shopping items open the put-away modal and show per-item destination / expiry controls
- deals page handles missing API key gracefully
- `/privacy` and `/terms` load from a signed-out browser

## PWA smoke checks

- Open DevTools Application panel and confirm `/manifest.webmanifest` is detected.
- Confirm the FreshTrack icon and theme color render in install metadata.
- Use mobile viewport on `/shopping`; quick-add remains reachable while scrolling.
- Toggle Store mode; list management, insights, and suggestion extras should hide while unchecked items stay visible.
- Simulate offline mode; the offline banner should appear and explain that writes need a connection.
- Lighthouse targets before launch: `/`, `/shopping`, `/deals`, and `/recipes`.

## Accessibility and keyboard pass

- Tab through `/auth`, `/settings`, `/shopping`, and all modals.
- Confirm modal focus is trapped and Escape closes non-destructive dialogs.
- Confirm shopping checkbox, delete, price, Paste List, and Put Away controls are reachable with keyboard.
- Confirm touch targets on `/shopping` are comfortable in a 390 px viewport.

## Rollback guidance

- Re-deploy last known good commit in Vercel.
- If migration introduced failure, revert app first and follow-up with DB remediation plan.
- Keep incident notes in `docs/pre-launch/FUNCTIONAL_CHECK_RESULTS.md` or issue tracker.
