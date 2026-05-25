---
paths:
  - "**/*.ts"
exclude_paths:
  - "**/*.tsx"
description: Plain TypeScript — services, API routes, lib, scripts — cyclomatic complexity up to 6
---

# TypeScript conventions (.ts)

Follow global coding standards in coding-standards.md for SOLID, DRY, KISS, YAGNI, fail-fast thinking, minimal diffs, and cyclomatic complexity up to six per function and module.

## Service layer

Browser-facing data access belongs in the Supabase service module and related helpers — keep orchestration cohesive, respect RLS through the authenticated client pattern already in the project, and avoid duplicating mapping logic across call sites. Never surface the service role key to the browser. Treat nullable database fields and optional JSON consistently at mapping boundaries.

## API routes and server-only code

Vercel handlers and other server entry points should use the admin Supabase client only on the server, validate inputs, return appropriate HTTP status semantics, and keep side effects (email, payments, crons) explicit. Share types with the rest of the app via types.ts or shared modules rather than leaking untyped payloads.

## lib and utilities

Pure helpers belong in lib or adjacent modules with clear naming. Prefer deterministic behavior, explicit errors for programmer mistakes, and narrow exports. Database types generation under lib should mirror schema changes without hand-waving unknown fields.

## Scripts

Seed scripts, migrations helpers, email tests, and one-off tooling run outside the SPA — they may use richer logging and process exit conventions. Assume service-role credentials stay in CI or local env only and are never bundled for the client.

## Consistency with the product docs

Defer product-specific rules (destructive menu save, pinned model, cron contracts) to CLAUDE.md and agents.md; keep this file focused on TypeScript ergonomics and structure.
