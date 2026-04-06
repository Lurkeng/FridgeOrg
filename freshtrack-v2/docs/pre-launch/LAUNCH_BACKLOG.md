# Launch backlog — merged from functionality + market review

**Artifacts:** [TRACEABILITY_MATRIX.md](./TRACEABILITY_MATRIX.md) · [FUNCTIONAL_CHECK_RESULTS.md](./FUNCTIONAL_CHECK_RESULTS.md) · [MARKET_COMPETITIVE.md](./MARKET_COMPETITIVE.md)

**Automated smoke (optional):** From `freshtrack-v2`, run `npm run test:e2e` — builds, serves preview on port 4173, asserts `/auth` renders FreshTrack branding. Uses `playwright.config.ts` and [`e2e/smoke.spec.ts`](../e2e/smoke.spec.ts).

---

## P0 — Blockers (fix before public launch)

| ID | Item | Source |
|----|------|--------|
| **SEC-1** | **IDOR:** Scope all **mutations by resource id** to the user’s `householdId` (food items: update/delete/mark opened/consumed/wasted; shopping list: toggle/update/delete; `fetchItemPrices`; `selectDealForItem`). Use `and(eq(id, …), eq(householdId, …))` after resolving the user’s household. | Code review |
| **SEC-2** | **Client auth shell:** Ensure unauthenticated users cannot see the authenticated layout — add explicit redirect in [`_app.tsx`](../src/routes/_app.tsx) when session is absent (not only `isPending`), or implement session check in `beforeLoad` on the server. | Code review |
| **QA-1** | Run **full P0 manual matrix** on **production** URL after deploy (auth, two users, inventory, scan, shopping, deals). | Traceability matrix |
| **OPS-1** | Confirm **Wrangler secrets** in prod: `BETTER_AUTH_SECRET`, `KASSALAPP_API_KEY`, optional `ANTHROPIC_API_KEY`; `BETTER_AUTH_URL` / `VITE_APP_URL` match live origin. | SETUP.md |

---

## P1 — Strongly recommended pre-launch or first patch

| ID | Item | Source |
|----|------|--------|
| **UX-1** | Revisit **“Live Sync”** sidebar copy if updates are not real-time WebSocket sync — e.g. “**Cloud sync**” or “**Shared with your household**”. | Functional + market |
| **UX-2** | **AI recipes:** Confirm [`recipes`](../src/routes/_app/recipes.tsx) shows clear UI for `no-key` state (hook already sets status). | Functional check |
| **LEGAL-1** | Publish **Privacy policy** + **Terms** (GDPR/EU: email, household data, cookies/session). | Market |
| **MKT-1** | Align **App Store / landing** copy with **Norway-first** positioning (see MARKET_COMPETITIVE.md). | Market |

---

## Post-launch / backlog (not blockers)

| ID | Item | Source |
|----|------|--------|
| **FEAT-1** | Wire **`notification_preferences`** or remove until used — expiry **reminders** are category table stakes. | Schema + market |
| **FEAT-2** | **PWA** / install prompt / offline messaging — web-only is OK if documented. | Market |
| **QA-2** | **Lighthouse** on `/` and `/deals`; **accessibility** pass (keyboard, modals). | Functional check |
| **AUTO-1** | Expand **Playwright** coverage (login → add item) once stable test credentials exist. | e2e/smoke.spec.ts |
| **OPS-2** | Error monitoring (e.g. Sentry) for Worker + client. | Plan optional |

---

## Sign-off checklist

- [ ] SEC-1 + SEC-2 addressed in code  
- [ ] QA-1 completed on production  
- [ ] OPS-1 verified  
- [ ] Legal/marketing P1 items either shipped or consciously deferred  

**Owner:** _________________ **Date:** _________________
