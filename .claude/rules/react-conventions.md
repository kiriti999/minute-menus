---
paths:
  - "**/*.tsx"
  - "pages/**"
  - "packages/ui/**"
  - "packages/reels/**"
  - "hooks/**"
description: React and TSX — hooks, UI composition, Tailwind — cyclomatic complexity up to 11
---

# React and TSX conventions

Pair this file with global coding-standards.md. TSX allows higher branching than arbitrary functions but stays stricter than plain TypeScript files — keep components readable and shallow.

## Components and pages

Favor focused components with a single primary responsibility. Large screens may inline subcomponents when that matches the existing owner-dashboard pattern; extract only when duplication or clarity clearly improves. Co-locate state with the subtree that needs it unless lifting is required for sharing.

## State and effects

Use React hooks for component state. Derive values with memoization only when measurement or complexity warrants it — avoid premature optimization. Effects should encode real synchronization with the outside world (subscriptions, imperative APIs), not duplicate render-time logic. Cleanup listeners and timers consistently.

## Styling

Tailwind is the styling layer; stay within utility-first patterns already used for light and dark themes. Avoid ad-hoc inline style objects unless addressing something utilities cannot express cleanly.

## Data into the tree

Feed components through props and established data hooks; do not introduce alternative client state stores. For owner and customer flows, route reads and writes through `@minute-menus/supabase-service` (app facade: `services/supabaseService.ts`) per agents.md rather than duplicating fetch logic in leaves.

Use `@minute-menus/ui` for loaders and save affordances; `@minute-menus/reels` for customer reel cards — extend those packages before copying markup into pages.

## Performance and UX expectations

Respect the app’s load and interaction targets: avoid unnecessary re-renders from unstable inline references where it matters, lazy-load heavy routes only when consistent with existing routing, and keep customer-facing paths resilient (loading and empty states).

## Complexity

If JSX and event handlers push a component toward unreadable branching, split UI sections into child components or extract pure predicate helpers into small functions — stay within the TSX cyclomatic complexity budget.
