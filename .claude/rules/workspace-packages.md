# Workspace packages

See **CLAUDE.md** workspace section and **`.cursor/rules/workspace-packages.mdc`** for the full package map.

## Quick rules

- Monorepo: `packages/*` via pnpm workspace; app + `api/` remain at repo root for Vercel.
- Import domain types from `@minute-menus/types`, DB types from `@minute-menus/types/db`.
- Browser data layer: `@minute-menus/supabase-service` via thin `services/supabaseService.ts` wrapper.
- Menu sync: `@minute-menus/menu-persistence`; meal plans: `@minute-menus/meal-plan-persistence`.
- API routes: `@minute-menus/logger`, `@minute-menus/mailer`, `@minute-menus/api-helpers`, `@minute-menus/email-templates`, `@minute-menus/payments`.
- UI loaders/spinners: `@minute-menus/ui`; reel cards: `@minute-menus/reels`.
- AI: `@minute-menus/ai` (not the legacy filename — `services/geminiService.ts` is a re-export shim).
- Errors: `@minute-menus/errors` only — no local duplicates.

When adding a package: create under `packages/`, add workspace dep to root `package.json`, run `pnpm install` and `pnpm build`.
