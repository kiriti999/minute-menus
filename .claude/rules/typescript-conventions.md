---
paths:
  - "**/*.ts"
  - "packages/**/*.ts"
exclude_paths:
  - "**/*.tsx"
description: Plain TypeScript — services, API routes, lib, scripts — cyclomatic complexity up to 6
---

# TypeScript conventions (.ts)

Follow global coding standards in coding-standards.md for SOLID, DRY, KISS, YAGNI, fail-fast thinking, minimal diffs, and cyclomatic complexity up to six per function and module.

## Service layer

Browser-facing data access belongs in `@minute-menus/supabase-service` (app facade: `services/supabaseService.ts`) and related workspace packages — menu persistence, metrics, meal-plan persistence. Keep orchestration cohesive, respect RLS through the injected authenticated client, and avoid duplicating mapping logic. Never surface the service role key to the browser. Use `@minute-menus/errors` when surfacing or wrapping Supabase failures.

## API routes and server-only code

Vercel handlers use the admin Supabase client and workspace packages (`mailer`, `email-templates`, `api-helpers`, `payments`, `logger`). Validate inputs, return appropriate HTTP status semantics, and keep route files thin. Share types via `@minute-menus/types` rather than untyped payloads.

## lib and utilities

App-root `lib/*` shims re-export workspace packages where noted in workspace-packages.mdc. New shared logic should go into the appropriate `packages/*` module. DB types live in `@minute-menus/types/db` — sync after schema changes.

## Workspace packages

Plain `.ts` under `packages/` follows the same complexity and SOLID rules. Packages export via `package.json` `"exports"`; no separate build step. See `.claude/rules/workspace-packages.md`.

## Scripts

Seed scripts, migrations helpers, email tests, and one-off tooling run outside the SPA — they may use richer logging and process exit conventions. Assume service-role credentials stay in CI or local env only and are never bundled for the client.

## Consistency with the product docs

Defer product-specific rules (destructive menu save, pinned model, cron contracts) to CLAUDE.md and agents.md; keep this file focused on TypeScript ergonomics and structure.
