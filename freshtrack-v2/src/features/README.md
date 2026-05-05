# Feature modules

This directory contains feature-first modules adopted incrementally.

Current moduleized feature:

- `inventory/`
  - `constants.ts`
  - `components/StorageTabs.tsx`

Rules:

- Keep feature-specific UI and constants inside `features/<feature>`.
- Keep generic primitives in `src/components/ui`.
- Keep route files in `src/routes` as composition layers.
