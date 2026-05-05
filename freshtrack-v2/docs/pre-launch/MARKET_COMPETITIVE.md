# Market and competitive check — FreshTrack

**Positioning (recommended one-liner):**  
**Norway-focused household fridge/freezer inventory, waste tracking, and grocery price awareness** — powered by your inventory and shopping list, with **Kassalapp** for price/deals data (not a full receipt-banking or loyalty product).

**Why not “global pantry app”:** The deals experience and Kassalapp integration are **Norwegian retail–specific**. Marketing or store copy that implies worldwide barcode accuracy or US-style grocery data will underdeliver.

---

## Competitor / analog feature matrix

Legend: **TS** = table stakes in category · **DF** = differentiator for FreshTrack · **N1** = not needed for v1

| Product / type | Inventory & expiry | Waste / sustainability | Prices & deals | Recipes / meal planning | Household / sync | Native / PWA | Notes |
|----------------|-------------------|------------------------|----------------|-------------------------|------------------|--------------|-------|
| **FreshTrack (this app)** | DF: fridge/freezer/pantry, categories | DF: waste logs + stats | DF: Kassalapp (shopping + deals UI) | DF: local match + optional AI (Anthropic) | DF: household + invite | Web (TanStack Start on Vercel) | **DF** = intended strength |
| **Kassalapp** (NO) | TS: product search | N1 | **TS** in Norway: barcode, price history, alerts, store map | N1 | Shopping list / cheapest basket | Native apps | **Partner/API** — feature-rich standalone; FreshTrack **does not** replicate receipt scan, bank sync, loyalty |
| **Mattilbud / retailer flyers** (NO) | N1 | N1 | TS: weekly offers | N1 | N1 | Apps | FreshTrack focuses on **your list + inventory**, not flyer browsing as primary UX |
| **Retailer apps** (Rema 1000, Kiwi, Coop, etc.) | N1 | Sometimes coupons | TS: their own prices | Sometimes | Limited | Native | Trust and **chain-specific**; FreshTrack is **retailer-agnostic** comparison via Kassalapp |
| **NoWaste / “food waste” apps** (generic) | Often simple | **TS**: waste focus | Weak | Weak | Varies | Varies | FreshTrack combines **inventory + waste + prices** — stronger **combined** story if executed |
| **Bring! / AnyList / Apple Reminders** | N1 | N1 | Sometimes price | N1 | **TS**: shared lists | Mobile-first | **TS** for lists — FreshTrack must be clearly **food + expiry + waste**, not “another list app” |
| **Meal-kit / AI recipe apps** | N1 | N1 | N1 | **TS**: strong | N1 | Native | FreshTrack AI is **optional**; classic recipes from local data are the fallback |

---

## Tag summary

| Item | Tag | Rationale |
|------|-----|-----------|
| Barcode scan + inventory | **DF** | Core loop for FreshTrack |
| Kassalapp-backed prices on shopping list | **DF** | Hard to copy without API; aligns with Norway |
| Waste analytics | **DF** | Differentiates from pure pantry apps |
| Optional AI recipes | **DF** | Upside; not required for credibility |
| Push expiry reminders | **TS** for category leaders | You have `notification_preferences` in DB but **no productized notifications** yet — **gap** |
| Receipt OCR / bank sync | **N1** | Kassalapp’s territory; avoid scope creep |
| Real-time collaborative editing | **N1** | “Cloud sync” is enough for v1; avoid overpromising “Live Sync” |

---

## Market gaps vs typical expectations

1. **Expiry reminders (email/push):** Often expected; DB placeholder exists — **not wired**.
2. **Native or installable PWA:** Category users often on phone in store; web-only is acceptable if UX is mobile-solid and **Add to Home Screen** is tested.
3. **Trust & compliance:** GDPR-friendly privacy page and clear handling of email/household data; disclaimer that **expiry suggestions are advisory**.
4. **Kassalapp dependency:** Document that prices come from a **third party**; handle **missing API key** and rate limits gracefully in copy and UI.

---

## Monetization / cost sanity (lightweight)

| Cost driver | Risk |
|-------------|------|
| **Anthropic** (AI recipes) | Usage scales with “Suggest AI” taps — cap or cache (you already cache ~30 min client-side). |
| **Kassalapp API** | Rate limits in code — monitor 429s and user-visible errors. |
| **Vercel + Turso/libSQL** | Usually fine at small scale; watch DB growth, query patterns, and API burst behavior on `fetchAllPrices`. |

---

## Positioning bullets (draft for store / landing)

1. Know what’s in your **fridge, freezer, and pantry** before it expires.  
2. Cut **food waste** with logging and trends your household can act on.  
3. **Compare prices** on the items you actually plan to buy (Norway), tied to your shopping list.  
4. Cook from what you have — **classic** recipe matches plus **optional AI** suggestions.  
5. **Household sharing** with one source of truth on Vercel + Turso — no spreadsheet chaos.

---

## Explicit “not building for v1” (scope control)

- Receipt scanning and bank transaction import (Kassalapp’s core elsewhere).  
- Full weekly-flyer browsing as the main navigation model.  
- Push notification infrastructure (unless you ship a minimal web-push milestone).  
- Native iOS/Android apps (unless wrapping the web app later).
