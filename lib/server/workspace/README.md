# Workspace packages for API routes

Vercel runs `api/**` as unbundled ESM and only ships compiled `.js`, but workspace
packages export `./src/index.ts` — so `import … from "@minute-menus/x"` crashes the
function at load (FUNCTION_INVOCATION_FAILED). API code imports runtime values from
these re-exports instead; `import type` from `@minute-menus/*` is fine (erased).
Relative imports anywhere an API route reaches need explicit `.js` extensions.
