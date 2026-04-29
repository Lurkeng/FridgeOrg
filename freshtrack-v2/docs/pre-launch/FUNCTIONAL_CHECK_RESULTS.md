# P0 / P1 functional and NFR check results

**Environment:** Static review + `npm run verify` in repo (2026-04-25).  
**Production deploy smoke:** Not run (no production URL or credentials in this session). Re-run matrix on your deployed Worker URL before launch.

---

## P0 — Auth, households, inventory, scan, shopping/deals, deploy

| Check | Result | Evidence / notes |
|-------|--------|------------------|
| Production build | **Pass** | `npm run build` completed with exit code 0 (client + SSR bundles). |
| Auth server enforcement | **Pass** | Server functions use `authMiddleware`; unauthenticated calls should redirect via middleware. |
| Client route guard | **Pass** | [`_app.tsx`](../src/routes/_app.tsx) now redirects to `/auth` when there is no session, and `npm run test:e2e` includes a protected-route redirect check. |
| Household data isolation — food item mutations | **Pass** | Food item mutations are scoped to `householdId` after resolving the authenticated user’s household context. |
| Household data isolation — shopping list mutations | **Pass** | Shopping list and deal selection mutations are scoped to `householdId` (including `fetchItemPrices` and `selectDealForItem`). |
| `getFoodItems` scoping | **Pass** | Filters by `householdId` from membership. |
| Manual: sign-up / sign-in / household | **Not run** | Requires browser + D1. |
| Manual: two-user household | **Not run** | |
| Manual: barcode scan mobile | **Not run** | |
| Manual: shopping + deals tabs | **Not run** | |
| Deploy smoke on production URL | **Not run** | Run P0 matrix after `wrangler deploy`. |

---

## P1 — Waste, settings, recipes, security review, a11y, perf

| Check | Result | Evidence / notes |
|-------|--------|------------------|
| AI recipes without API key | **Pass (UX)** | [`suggestAIRecipes`](../src/server/recipes.ts) throws if no key; [`useAIRecipes`](../src/hooks/useAIRecipes.ts) maps message containing `ANTHROPIC_API_KEY` to status `no-key`. Confirm UI shows friendly copy on [`recipes`](../src/routes/_app/recipes.tsx) page (verify in browser). |
| AI recipes with key | **Not run** | Needs `ANTHROPIC_API_KEY` in env. |
| Waste charts empty / full | **Not run** | |
| Settings persistence | **Not run** | |
| Secrets in client bundle | **Pass (spot)** | API keys referenced via `context.env` in server handlers, not `import.meta.env` for Anthropic in client. |
| IDOR beyond food items | **Pass (spot)** | Reviewed shopping/deals endpoints now scope by `householdId`, including `fetchItemPrices` and `selectDealForItem`. |
| Lighthouse / LCP | **Not run** | Run on `/` and `/deals`. |
| Accessibility | **Not run** | Keyboard, modals, contrast. |
| Offline / PWA | **N/A** | No service worker in app source; expect online-only. Sidebar “Live Sync” implies real-time — data is request/refresh based unless you add subscriptions. |

---

## Sidebar copy vs behavior

- **“Live Sync” / D1:** Data persists on server; updates appear after refetch, not WebSocket real-time. Consider softer copy (“Cloud sync”) unless you add realtime.

---

## Schema vs product

- **`notification_preferences`** exists in [`schema.ts`](../src/db/schema.ts) but has **no** server routes or UI hooks found — notifications are a **market gap**, not a hidden feature.
