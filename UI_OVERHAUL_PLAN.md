# FreshTrack UI Overhaul Plan

**Style:** Glassmorphism + Motion · **Library:** Framer Motion · **Target:** Desktop-first · **Scope:** All pages

---

## Phase 1 — Foundation & Design System

The first phase establishes the visual language everything else builds on. No page work happens until this is solid.

### 1.1 Install & Configure Framer Motion

- `npm install framer-motion`
- Create `src/lib/animations.ts` with shared motion presets:
  - `fadeInUp` — staggered card entrance (opacity 0→1, y 20→0, 0.4s spring)
  - `scaleIn` — modals and overlays (scale 0.95→1, opacity 0→1)
  - `slideInRight` — page transitions via `AnimatePresence`
  - `staggerContainer` — parent wrapper with `staggerChildren: 0.06`
  - `hoverLift` — cards lift 4px with soft shadow on hover
  - `pulseGlow` — subtle glow pulse for alerts/expiring items
  - `tabSwitch` — layout animation for active tab indicator

### 1.2 Glassmorphism Design Tokens (Tailwind)

Update `tailwind.config.ts` to add:

- **Backdrop blur utilities:** `blur-glass` (12px), `blur-glass-heavy` (20px)
- **Glass background colors:**
  - `glass-white` → `rgba(255, 255, 255, 0.6)`
  - `glass-frost` → `rgba(14, 165, 233, 0.08)`
  - `glass-dark` → `rgba(15, 23, 42, 0.4)`
- **New shadows:**
  - `shadow-glass` → `0 8px 32px rgba(0, 0, 0, 0.06)`
  - `shadow-glass-hover` → `0 12px 40px rgba(0, 0, 0, 0.1)`
  - `shadow-glow-frost` → `0 0 20px rgba(14, 165, 233, 0.15)`
  - `shadow-glow-fresh` → `0 0 20px rgba(34, 197, 94, 0.15)`
  - `shadow-glow-danger` → `0 0 20px rgba(239, 68, 68, 0.15)`
- **Border colors:** `border-glass` → `rgba(255, 255, 255, 0.2)`
- **Gradient presets:** Via CSS custom properties for hero backgrounds and accent strips

### 1.3 Global Styles Overhaul (`globals.css`)

- Set a subtle mesh gradient background (soft blue-to-white-to-green) on `body`, giving depth behind glass cards
- Define CSS custom properties for glass surfaces
- Add smooth scrollbar styling (thin, translucent)
- Import a modern font pairing: **Inter** (body) + **Plus Jakarta Sans** (headings) via `next/font`
- Define base transition timing: `cubic-bezier(0.4, 0, 0.2, 1)` as default

### 1.4 Core Component Library Rebuild

**GlassCard** (new) — The foundational surface component:
- `backdrop-filter: blur(12px)`, white/frost-tinted background at 60% opacity
- 1px semi-transparent border, soft shadow
- Framer Motion `whileHover` lift + shadow deepening
- Variants: `default`, `frost` (blue tint), `fresh` (green tint), `danger` (red tint)
- Used everywhere: stat cards, item cards, recipe cards, form containers

**Button** (rebuild):
- Glassmorphism variants alongside solid ones
- `whileHover` scale(1.02) + `whileTap` scale(0.98) via Framer Motion
- Animated gradient border on primary buttons
- Ghost variant with glass hover state

**Badge** (rebuild):
- Pill shape with glass background
- Subtle glow matching status color (green for fresh, amber for warning, red for danger)
- `animate` entrance with scale spring

**Modal** (rebuild):
- `AnimatePresence` for enter/exit
- Backdrop with animated blur-in
- Content slides up with spring physics
- Glass surface with frosted border

**Input / Select** (new shared components):
- Glass-backed input fields with glowing focus ring
- Smooth label float animation on focus
- Consistent sizing and spacing tokens

---

## Phase 2 — Layout & Navigation

### 2.1 Sidebar Redesign

- Glass sidebar surface with `backdrop-blur` and translucent background
- **Logo area:** Larger, with a subtle frost glow behind the icon
- **Nav items:** Replace flat list with pill-shaped active indicator that *animates between items* using Framer Motion `layoutId` (smooth sliding highlight)
- **Icon animations:** Icons get subtle `whileHover` rotation or bounce
- **Footer:** Redesign demo-mode banner as a small glass chip with pulse animation
- **Collapsed state:** Add ability to collapse sidebar to icon-only mode (64px) with smooth width transition — prep for future mobile

### 2.2 Page Transition System

- Wrap page content in `AnimatePresence` + `motion.div` in `layout.tsx`
- Pages fade-slide in from right on enter, fade out on exit
- Stagger child elements so content cascades in (header → stats → cards → lists)
- Keep sidebar static during transitions for visual anchoring

### 2.3 Page Header Pattern

Create a consistent `PageHeader` component used on every page:
- Page title with gradient text effect (subtle frost-to-white)
- Optional subtitle/description
- Action button area (right-aligned)
- Entrance animation: title slides in, then action buttons fade in

---

## Phase 3 — Dashboard (Home Page)

This is the hero page — it needs to immediately wow.

### 3.1 Stats Row

- 4 glass cards in a grid, each with:
  - Large animated number (count-up animation on mount using Framer Motion)
  - Subtle icon with colored glow behind it
  - Micro-sparkline or trend indicator
  - `hoverLift` interaction
- Color-coded glow per card: frost (total), frost (fridge), frost-600 (freezer), warning (expiring)

### 3.2 Expiry Alerts Section

- Replace flat alert with a visually striking glass banner:
  - Animated gradient border (red pulse for expired items)
  - Icon with `pulseGlow` animation
  - Expandable list of items with staggered fade-in
  - "Dismiss" and "View All" actions

### 3.3 "Use These Soon" Section

- Horizontal scrollable row of mini food cards (not a plain list)
- Each card: glass surface, category emoji at top, item name, expiry countdown with color-coded ring/progress indicator
- Cards animate in with stagger
- Hover reveals quick actions (Used It / Wasted)

### 3.4 Quick Actions Grid

- 3 large glass cards replacing the current plain cards
- Each with: icon (animated on hover), title, subtle description
- Gradient accent line at top of each card
- `whileHover` tilt effect (slight perspective transform)

---

## Phase 4 — My Food (Items Page)

### 4.1 Search & Filters Bar

- Glass search bar with animated magnifying glass icon
- Focus state: bar expands slightly, glow ring appears
- Location tabs redesigned as segmented control with sliding `layoutId` indicator
- Item count badges animate when numbers change

### 4.2 FoodItemCard Redesign

- Full glass card treatment with colored left border based on expiry status
- Layout: emoji + name/details on left, expiry badge + actions on right
- Expiry badge gets a soft glow matching its status color
- "Opened" badge as a small glass pill
- Three-dot menu opens as animated dropdown (scale + fade from top-right)
- Cards enter viewport with staggered `fadeInUp`
- Delete/consume actions: card shrinks and fades out with `AnimatePresence`

### 4.3 Add Item Flow

- Modal slides up with spring animation
- Form sections animate in sequentially (name → location → category → details)
- Location selector: 3 glass pills with icons, selected state has glow + scale
- Category grid: glass tiles with emoji, selected gets colored border glow
- Expiry date shows a visual "freshness timeline" bar
- Submit button gets animated gradient + success state (checkmark morphs in)

### 4.4 Empty State

- Beautiful illustration area (CSS-only or SVG) with floating food emojis
- Animated call-to-action button with glow

---

## Phase 5 — Scan Barcode Page

### 5.1 Camera View

- Glass-framed camera viewport with rounded corners
- Scanning overlay: animated corner brackets that pulse
- Scan line animation sweeping vertically
- Detection flash effect when barcode is found

### 5.2 Manual Entry

- Glass input card for manual barcode
- Animated transition between camera and manual modes

### 5.3 Product Result

- Product info slides up from bottom in a glass card
- Product image (if available) with fade-in
- Auto-populated fields highlight briefly to show they were filled
- "Add to Inventory" button with success animation

---

## Phase 6 — Recipes Page

### 6.1 Recipe Cards

- Glass card grid layout
- Match percentage as a circular progress ring (animated on mount) with glow
- Tag pills with glass styling
- Ingredient match indicators: green glow for matched, subtle gray for missing
- Card expand animation: smooth height expansion revealing full instructions
- Hover state: card lifts, shadow deepens

### 6.2 Filter Bar

- Horizontal scrollable tag filter chips with glass styling
- Active filter gets glow + `layoutId` sliding background
- Stagger animation on tag appearance

### 6.3 Recipe Detail (Expanded)

- Instructions appear with staggered line-by-line animation
- Ingredient list with checkmark icons for matched items (animated)
- "Cook This" button concept for future use

---

## Phase 7 — Waste Tracker Page

### 7.1 Stats Row

- 4 glass stat cards matching dashboard pattern
- Animated count-up numbers
- "This Month" card shows trend arrow (up/down) with color

### 7.2 Charts Overhaul

- Restyle Recharts with glass-compatible theme:
  - Translucent gradient fills under area charts
  - Glowing dots on data points
  - Glass tooltip cards
  - Soft grid lines
- Weekly trend: area chart with frost-gradient fill
- Category breakdown: horizontal bar chart with rounded bars and glass-tinted colors

### 7.3 Waste Log

- Glass table/list with alternating subtle tint
- Row hover: glass highlight + slight lift
- Entry animations with stagger

---

## Phase 8 — Auth Page

### 8.1 Layout

- Centered glass card on gradient mesh background (full-page, no sidebar)
- Card has animated border shimmer effect

### 8.2 Form

- Tab switch (Login/Signup) with `layoutId` sliding indicator
- Inputs with glass styling and animated focus states
- Household setup section with smooth expand/collapse
- Submit button with loading spinner → success checkmark animation
- Demo mode notice as a subtle glass banner at bottom

---

## Phase 9 — Polish & Micro-interactions

### 9.1 Loading States

- Skeleton screens with glass shimmer animation (not plain gray)
- Pulse effect on glass surfaces while loading

### 9.2 Toast / Notification System

- Glass toast cards that slide in from top-right
- Auto-dismiss with shrinking progress bar
- Color-coded border for success/warning/error

### 9.3 Scroll Animations

- Cards that are below the fold animate in when scrolled into view using `whileInView`
- Subtle parallax on dashboard hero area

### 9.4 Number Animations

- All stat numbers use count-up animation on mount
- Badge counts animate when values change

### 9.5 Hover & Focus Consistency

- Every interactive element has a clear hover state (lift, glow, or scale)
- Focus-visible rings use frost-glow for accessibility
- Consistent timing across all transitions (200-400ms range)

---

## Implementation Order (Recommended)

| Step | What                          | Estimated Scope    |
|------|-------------------------------|--------------------|
| 1    | Phase 1 (Foundation)          | ~8 files, new + modified |
| 2    | Phase 2 (Layout & Nav)        | ~3 files           |
| 3    | Phase 3 (Dashboard)           | ~1 page + components |
| 4    | Phase 4 (Items)               | ~3 components + page |
| 5    | Phase 5 (Scan)                | ~1 page            |
| 6    | Phase 6 (Recipes)             | ~1 page            |
| 7    | Phase 7 (Waste)               | ~1 page            |
| 8    | Phase 8 (Auth)                | ~1 page            |
| 9    | Phase 9 (Polish)              | Cross-cutting       |

Each phase builds on the previous one. Phase 1 is the most critical — once the design system and core components are solid, the page-level work becomes applying patterns consistently.

---

## Technical Notes

- **No new UI framework** — we stay with Tailwind + custom components, just add Framer Motion
- **No breaking changes to data/hooks** — this is purely a visual overhaul; `useFoodItems`, `useLocalStorage`, Supabase client, types, and data files stay untouched
- **Performance** — Framer Motion uses hardware-accelerated transforms; `backdrop-filter` is GPU-composited. We avoid animating layout-triggering properties (width, height, top, left)
- **Accessibility** — all motion respects `prefers-reduced-motion` via Framer Motion's built-in support; focus states remain visible; color contrast maintained on glass surfaces
