# Vercel API functions — read before touching `api/**`, `lib/server/**`, `vercel.json`, or any package an API route imports

Incident (Oct 2026): 11 of 12 production functions — including payments and the Razorpay webhook — crashed with `FUNCTION_INVOCATION_FAILED` for ~2 days. Everything type-checked, `pnpm build` passed and `pnpm dev` worked. The causes below only show up on Vercel.

## How Vercel runs this repo

- Each `api/**/*.ts` file is one serverless function. Vercel compiles them (and every relative file they reach, including `packages/*/src`) to **unbundled ESM `.js`** and runs them on **Node 24**. Nothing is bundled.
- Only compiled `.js` is shipped — `.ts` sources are not in the deployed bundle.

## Hard rules

1. **Max 12 functions (Hobby plan). We are at 12/12.** Never add a file under `api/`. Add an `?action=` branch to an existing route (pattern: `api/confirm-payment.ts`, `api/counter-invoice.ts`, `api/keepalive.ts`) and, if a public URL is needed, a `vercel.json` rewrite. Put the logic in `lib/server/`. Rewrites do not add functions; files do. Helper files must never live under `api/`.
2. **Explicit `.js` on every relative import an API route reaches** — in `api/`, `lib/`, and inside `packages/*/src`: `from "../lib/server/logger.js"`, `from "./cartPricing.js"`. Never extensionless, never `.ts`. (TypeScript and Vite resolve `.js` to the `.ts` source.)
3. **No runtime imports of `@minute-menus/*` in code an API route reaches.** Packages export `./src/index.ts`, which isn't shipped. Use the relative re-exports in `lib/server/workspace/` (`currency`, `types`, `api-helpers`, `email-templates`, `mailer`); add a one-line re-export there for another package. Type-only imports (`import type …` or `import { type X }`) from `@minute-menus/*` are fine — they are erased.
4. Server secrets stay server-side (`lib/supabase-admin.ts`, env vars) — see `ai-api-key-security.md`.

## Verify — required for any change an API route can reach

- `pnpm check:api` — static check of rules 1–3. Also runs at the start of `pnpm build`, so a violation fails the Vercel deploy instead of shipping crashing functions. Never bypass it.
- `pnpm verify:api` — runs `vercel build --yes`, then loads every built function from an isolated copy of exactly what Vercel ships. Use Node 24 (`.vc-config.json` runtime). Do **not** test by importing `.vercel/output/functions/*` in place — Node falls back to the repo's `node_modules` and `.ts` sources and hides the crash.
- After deploying, hit each changed route in production: a working function answers with its own JSON (`405`, `400`, `401`); `500` + `FUNCTION_INVOCATION_FAILED` means it crashed at load.

## Current functions (12/12)

`confirm-payment` · `counter-invoice` (+ Razorpay webhook via `/api/razorpay-webhook` rewrite) · `create-plus-order` · `create-razorpay-order` · `image/enhance` · `keepalive` (daily cron + SEO: `?action=page` for `/:slug` and `/:slug/menu`, `?action=sitemap` for `/sitemap.xml` and `/:slug/sitemap.xml`) · `menu/upload-media` · `parse-invoice` · `sold-out-email` · `subscription/auto-deliver` · `subscription/cancel-order` · `subscription/daily-digest`

If a slot is ever needed: merge `create-plus-order` into `create-razorpay-order`, or the three `subscription/*` routes into one `?action=` route — update `vercel.json` crons and rewrites to match.
