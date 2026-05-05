# P0 / P1 functional and NFR check results

**Environment:** Static review + `npm run typecheck && npm run build && npm run test:e2e` in `freshtrack-v2` (2026-04-30).
**Production deploy smoke:** Not run (no production URL or credentials in this session). Re-run matrix on the deployed Vercel URL before launch.

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
| Manual: sign-up / sign-in / household | **Not run** | Requires browser + configured Turso database. |
| Manual: two-user household | **Not run** | |
| Manual: barcode scan mobile | **Not run** | |
| Manual: shopping + deals tabs | **Not run** | Include Store mode, Paste List, Put Away, and per-item destination controls. |
| Deploy smoke on production URL | **Not run** | Run P0 matrix after Vercel deploy. |

---

## P1 — Waste, settings, recipes, security review, a11y, perf

| Check | Result | Evidence / notes |
|-------|--------|------------------|
| AI recipes without API key | **Pass (UX)** | [`suggestAIRecipes`](../src/server/recipes.ts) throws if no key; [`useAIRecipes`](../src/hooks/useAIRecipes.ts) maps message containing `ANTHROPIC_API_KEY` to status `no-key`. Confirm UI shows friendly copy on [`recipes`](../src/routes/_app/recipes.tsx) page (verify in browser). |
| AI recipes with key | **Not run** | Needs `ANTHROPIC_API_KEY` in env. |
| Waste charts empty / full | **Not run** | |
| Settings persistence | **Not run** | |
| Expiry reminder settings | **Pass (code + build)** | Preferences, preview server function, settings form, and dashboard preview added. Manual authenticated save still required. |
| Grocery insights | **Pass (code + build)** | Purchase history summary now powers dashboard cards and shopping recap. |
| Secrets in client bundle | **Pass (spot)** | API keys referenced via `context.env` in server handlers, not `import.meta.env` for Anthropic in client. |
| IDOR beyond food items | **Pass (spot)** | Reviewed shopping/deals endpoints now scope by `householdId`, including `fetchItemPrices` and `selectDealForItem`. |
| Lighthouse / LCP | **Pass with perf follow-up** | Local Lighthouse on Vite dev server: `/`, `/shopping`, `/deals`, `/recipes` all scored Performance 55, Accessibility 100, Best Practices 100, SEO 100. Re-run against production before launch. |
| Accessibility | **Not run** | Keyboard, modals, contrast, Store mode, Paste List, and Put Away. |
| Offline / PWA | **Partial** | Manifest, icons, install metadata, and offline banner added. No service worker/offline writes yet. |

---

## Sidebar copy vs behavior

- **Server persistence:** Data persists in Turso via server APIs; updates appear after refetch, not WebSocket real-time.

---

## Schema vs product

- **`notification_preferences`** now has server functions, settings UI, and dashboard preview. Email / push delivery remains deliberately deferred until provider and production env are chosen.
