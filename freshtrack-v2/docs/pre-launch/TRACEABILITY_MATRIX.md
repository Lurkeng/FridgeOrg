# FreshTrack v2 — Traceability matrix

**Purpose:** Map user-visible features to routes and server functions for regression testing.  
**Owner column:** Assign a human owner for sign-off (`—` = unassigned).

**Severity:** P0 = launch blocker if failing; P1 = should fix before or soon after launch.

| # | Feature / user story | Route(s) | Server function(s) | Priority | Owner | Pass / fail | Notes |
|---|----------------------|----------|----------------------|----------|-------|-------------|-------|
| **Auth & shell** |
| A1 | User can sign up and sign in | `/auth` | better-auth via `/api/auth/$` | P0 | — | **Code review** | Email/password; household create/join on signup |
| A2 | User can sign out | Sidebar / settings (if present) | `signOut` client | P0 | — | **Not exercised** | Confirm from UI |
| A3 | Unauthenticated users cannot use app data | `/_app/*` | All fns use `authMiddleware` | P0 | — | **Pass (code + smoke)** | `_app.tsx` now redirects when session is absent; smoke test verifies `/items` redirects to `/auth`. |
| **Households** |
| H1 | View current household | `/settings` | `getMyHousehold` | P0 | — | **Not exercised** | |
| H2 | Create household | `/auth` (signup flow), `/settings` | `createHousehold` | P0 | — | **Not exercised** | |
| H3 | Join with invite code | `/auth`, `/settings` | `joinHousehold` | P0 | — | **Not exercised** | |
| H4 | List members | `/settings` | `getHouseholdMembers` | P1 | — | **Not exercised** | |
| H5 | Regenerate invite code | `/settings` | `regenerateInviteCode` | P1 | — | **Not exercised** | |
| **Inventory** |
| I1 | List food items (scoped to household) | `/`, `/items` | `getFoodItems` | P0 | — | **Not exercised** | Uses `getUserHouseholdId` — IDOR mitigated |
| I2 | Add item | `/items` | `addFoodItem` | P0 | — | **Not exercised** | Zod validation |
| I3 | Update / delete item | `/items` | `updateFoodItem`, `deleteFoodItem` | P0 | — | **Code review** | Mutations are household-scoped. |
| I4 | Mark opened / wasted / consumed | `/items` | `markOpened`, `markWasted`, `markConsumed` | P0 | — | **Code review** | Mutations are household-scoped. |
| **Scan** |
| S1 | Camera barcode scan | `/scan` | (client ZXing; may call add flow) | P0 | — | **Not exercised** | Mobile Safari + Android Chrome |
| **Shopping** |
| SH1 | List / add / toggle / update / delete shopping items | `/shopping` | `getShoppingList`, `addShoppingItem`, `toggleShoppingItem`, `updateShoppingItem`, `deleteShoppingItem`, `clearCheckedItems` | P0 | — | **Code review** | Mutations and lookups are household-scoped. |
| SH2 | Fetch prices (single + batch) | `/shopping` | `fetchItemPrices`, `fetchAllPrices` | P0 | — | **Not exercised** | Rate limits in server |
| **Deals & prices (Kassalapp)** |
| D1 | Search products | `/deals` (Search tab) | `searchProducts` | P1 | — | **Not exercised** | POST |
| D2 | Deals for shopping list | `/deals` (My Deals) | `getDealsForShoppingList` | P0 | — | **Not exercised** | GET |
| D3 | Select deal for item | `/deals`, `/shopping` | `selectDealForItem` | P1 | — | **Code review** | Update is scoped to household + item id. |
| D4 | Price drops | `/deals` | `getPriceDrops` | P1 | — | **Not exercised** | |
| D5 | Nearby stores | `/deals` | `findNearbyStores` | P1 | — | **Not exercised** | |
| **Recipes** |
| R1 | Static / matching recipes (local data) | `/recipes` | `findMatchingRecipes` (client) | P1 | — | **Not exercised** | No server |
| R2 | AI recipe suggestions | `/recipes` | `suggestAIRecipes` | P1 | — | **Code review** | Throws if no `ANTHROPIC_API_KEY`; client maps to `no-key` state |
| R3 | Recipe preferences | `/recipes`, `/settings` | `getRecipePreferences`, `saveRecipePreferences` | P1 | — | **Not exercised** | |
| **Waste** |
| W1 | Waste logs & stats | `/waste` | `getWasteLogs`, `getWasteStats`, `addWasteLog` | P1 | — | **Not exercised** | Charts: empty + populated |
| **Settings** |
| ST1 | Profile / household / preferences UI | `/settings` | households + `recipe-preferences` | P1 | — | **Not exercised** | |
| **Non-functional (see FUNCTIONAL_CHECK_RESULTS.md)** |
| N1 | HTTPS, secrets not in client bundle | — | `env` / wrangler | P0 | — | **Build OK** | `npm run build` succeeded |
| N2 | IDOR / household scoping | — | All server modules | P0 | — | **Pass (spot)** | Household context helper is centralized and applied across food/shopping/deals mutations. |
| N3 | Accessibility | All routes | — | P1 | — | **Not run** | Manual / axe |
| N4 | Performance (LCP, heavy routes) | `/deals`, `/recipes` | — | P1 | — | **Not run** | Lighthouse |

---

## How to use this matrix

1. Copy this table into a spreadsheet if you want filters and owner assignment.
2. Replace **Not exercised** with **Pass** / **Fail** as you run manual QA on staging/production.
3. Treat **Code review** rows as validated by static review unless manual QA contradicts.
