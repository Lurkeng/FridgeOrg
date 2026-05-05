# Server Functions

This document maps server modules to feature ownership and guardrails.

## Guardrails

- All protected handlers must use `authMiddleware`.
- Household-scoped reads/writes must resolve household via `getUserHouseholdId`.
- Mutations should never update cross-household rows.
- Input validation should use zod schemas per handler.

## Module map

| Module | Purpose | Auth required | Household scoped |
| --- | --- | --- | --- |
| `src/server/food-items.ts` | inventory CRUD + lifecycle actions | yes | yes |
| `src/server/shopping-list-core.ts` | shopping list CRUD/toggle/clear | yes | yes |
| `src/server/shopping-list-pricing.ts` | pricing lookups | yes | yes |
| `src/server/shopping-list-suggestions.ts` | restock suggestions | yes | yes |
| `src/server/shopping-list.ts` | shopping list module exports | n/a | n/a |
| `src/server/deals.ts` | deals search, price drops, nearby stores | yes | mixed |
| `src/server/households.ts` | create/join/list household actions | yes | yes |
| `src/server/recipe-preferences.ts` | user preferences for recipes | yes | yes |
| `src/server/saved-recipes.ts` | save/list/delete recipes | yes | yes |
| `src/server/waste.ts` | waste logs and summaries | yes | yes |
| `src/server/achievements.ts` | achievement reads/writes | yes | yes |
| `src/server/export.ts` | export endpoints | yes | yes |

## Route-to-server examples

- `src/routes/_app/items.tsx` -> `food-items.ts`
- `src/routes/_app/shopping.tsx` -> `shopping-list.ts`
- `src/routes/_app/deals.tsx` -> `deals.ts`
- `src/routes/_app/recipes.tsx` -> `saved-recipes.ts`, `recipe-preferences.ts`
- `src/routes/_app/settings.tsx` -> `households.ts`, `recipe-preferences.ts`
