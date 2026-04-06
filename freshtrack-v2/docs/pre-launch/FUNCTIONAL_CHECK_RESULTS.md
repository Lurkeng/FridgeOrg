# P0 / P1 functional and NFR check results

**Environment:** Static review + `npm run build` in repo (2026-04-04).  
**Production deploy smoke:** Not run (no production URL or credentials in this session). Re-run matrix on your deployed Worker URL before launch.

---

## P0 — Auth, households, inventory, scan, shopping/deals, deploy

| Check | Result | Evidence / notes |
|-------|--------|------------------|
| Production build | **Pass** | `npm run build` completed with exit code 0 (client + SSR bundles). |
| Auth server enforcement | **Pass** | Server functions use `authMiddleware`; unauthenticated calls should redirect via middleware. |
| Client route guard | **Gap** | [`_app.tsx`](../src/routes/_app.tsx) comments say redirect to `/auth` but `beforeLoad` is empty and the layout only waits for `isPending`. If `useSession()` resolves with `data: null`, the shell may still render until queries fail. [`deals.tsx`](../src/routes/_app/deals.tsx) handles session/redirect explicitly; other pages may not. **Recommendation:** `if (!isPending && !session?.user) navigate({ to: '/auth' })` in `_app` layout (or server `beforeLoad` with session). |
| Household data isolation — food item mutations | **Fail (security)** | [`updateFoodItem`](../src/server/food-items.ts), [`deleteFoodItem`](../src/server/food-items.ts), [`markOpened`](../src/server/food-items.ts), [`markConsumed`](../src/server/food-items.ts) filter by `foodItems.id` only — **no `householdId` check**. A user who obtains another household’s item UUID could mutate/delete it. [`markWasted`](../src/server/food-items.ts) loads the row first (still should assert `householdId` matches user). **Recommendation:** join or `where(and(eq(id), eq(householdId, userHouseholdId)))` on all mutations. |
| Household data isolation — shopping list mutations | **Fail (security)** | [`toggleShoppingItem`](../src/server/shopping-list.ts), [`updateShoppingItem`](../src/server/shopping-list.ts), [`deleteShoppingItem`](../src/server/shopping-list.ts), and price fetch path in [`fetchItemPrices`](../src/server/shopping-list.ts) use `id` only without scoping to `householdId`. Same IDOR class as food items. [`clearCheckedItems`](../src/server/shopping-list.ts) correctly scopes by household. [`selectDealForItem`](../src/server/deals.ts) updates by `shoppingItemId` only — same issue. |
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
| IDOR beyond food items | **Fail** | `shopping-list.ts`: toggle/update/delete/fetchItemPrices — see row above. `waste.ts` reads scoped by household; `addWasteLog` uses user’s `householdId`. Spot-check `deals.ts` for any mutation by foreign id. |
| Lighthouse / LCP | **Not run** | Run on `/` and `/deals`. |
| Accessibility | **Not run** | Keyboard, modals, contrast. |
| Offline / PWA | **N/A** | No service worker in app source; expect online-only. Sidebar “Live Sync” implies real-time — data is request/refresh based unless you add subscriptions. |

---

## Sidebar copy vs behavior

- **“Live Sync” / D1:** Data persists on server; updates appear after refetch, not WebSocket real-time. Consider softer copy (“Cloud sync”) unless you add realtime.

---

## Schema vs product

- **`notification_preferences`** exists in [`schema.ts`](../src/db/schema.ts) but has **no** server routes or UI hooks found — notifications are a **market gap**, not a hidden feature.
