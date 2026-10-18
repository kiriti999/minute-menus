# Workspace packages for API routes

Vercel runs `api/**` as unbundled ESM and ships only compiled `.js`, but workspace
packages export `./src/index.ts` — so `import { value } from "@minute-menus/x"` crashes
the function at load (FUNCTION_INVOCATION_FAILED). API code imports runtime values from
these re-exports instead; `import type` from `@minute-menus/*` is fine (erased).

Need another package? Add `<pkg>.ts` here with
`export * from "../../../packages/<pkg>/src/index.js";`, and make sure that package's own
relative imports use explicit `.js`.

Enforced by `pnpm check:api` (runs in `pnpm build`). Full rules: `.claude/rules/vercel-api.md`.
