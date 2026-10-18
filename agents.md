# agents.md — AI Agent Guide for Minute Menus

> Task-level rules for coding agents. Project orientation and file map live in CLAUDE.md. Workspace package map: **`.cursor/rules/workspace-packages.mdc`**. **Do not paste code into these docs** — describe patterns here; implement in source files.

## Engineering standards

Canonical guidance lives in **`.claude/rules/coding-standards.md`**, **`typescript-conventions.md`**, **`react-conventions.md`**, and **`workspace-packages.md`**. Cursor mirrors these under **`.cursor/rules/`**.

Interpret **SOLID** as: single responsibility per module; open extension through clear package seams; narrow interfaces; dependency inversion via injected Supabase clients and shared packages. Pair with **DRY**, **KISS**, **YAGNI**, and **fail-fast** at boundaries.

Respect cyclomatic complexity limits (**functions and plain .ts:** 6, **TSX:** 11). Ship minimal scoped diffs. Run **pnpm build** after package or import changes (it runs `pnpm check:api` first). Anything an API route can reach also needs **pnpm verify:api** — see **`.claude/rules/vercel-api.md`**.

---

## Monorepo and packages

The app is a **pnpm workspace**. Shared libraries live in `packages/` and are imported as `@minute-menus/*`. The Vite app and `api/` directory stay at the repo root for Vercel deployment.

**Before starting package work:** read **`.cursor/rules/workspace-packages.mdc`** for the full map.

Key boundaries:

- **Types:** `@minute-menus/types` for domain models; `@minute-menus/types/db` for Supabase generated types.
- **Data layer:** `@minute-menus/supabase-service` holds all browser-side Supabase methods. The app exposes `supabaseService` via a thin wrapper in `services/supabaseService.ts` that calls `createSupabaseService(supabase)`.
- **Persistence helpers:** `@minute-menus/menu-persistence` and `@minute-menus/meal-plan-persistence` — not called directly from UI; invoked from supabase-service.
- **UI primitives:** `@minute-menus/ui` (loaders, save button); `@minute-menus/reels` (customer reel cards).
- **Server-only:** `@minute-menus/mailer`, `@minute-menus/email-templates`, `@minute-menus/api-helpers`, `@minute-menus/payments` — server code, not for React pages. **`api/*` routes must not import any `@minute-menus/*` package at runtime** (Vercel doesn't ship the `.ts` sources — the function crashes at load); they use `lib/server/` helpers or the `lib/server/workspace/<pkg>.js` re-exports.
- **Errors:** always `@minute-menus/errors` — never duplicate `getErrorMessage` / `throwStepError` locally.
- **Logging:** `@minute-menus/logger` with a scoped name in API routes and services.

Legacy shims at the app root (`lib/currency.ts`, `lib/errorMessage.ts`, `lib/mailer.ts`, `services/geminiService.ts`) re-export packages — prefer direct package imports in new code.

---

## How data should work

**Browser (customer and owner UI):** All reads and writes go through `supabaseService` (backed by `@minute-menus/supabase-service`). It resolves the current restaurant from the authenticated session (owners) or from the slug/restaurant ID passed into the customer app.

**Server (Vercel API routes):** Use the admin Supabase client with the service role key. Use `lib/server/` helpers (and `lib/server/workspace/<pkg>.js` for package code) for mail, templates, payments, pricing, and logging. Never import or expose the service role key in client-side code.

**Vercel API rules (source of truth: `.claude/rules/vercel-api.md`):**
- **At most 12 serverless functions** — one per `api/**/*.ts` file — and the project is **at 12/12**. Never add an `api/` file: extend an existing handler with `?action=` (+ `vercel.json` rewrite); shared logic in `lib/server/`.
- Vercel runs `api/` as unbundled ESM on Node 24 and ships only compiled `.js`: every relative import an API route reaches needs an explicit **`.js`** extension (also inside `packages/*/src`), and runtime package code comes from **`lib/server/workspace/<pkg>.js`**, never `@minute-menus/*`.
- Verify with **`pnpm check:api`** (runs inside `pnpm build`, blocking bad deploys) and **`pnpm verify:api`** (isolated load of every built function). Loading `.vercel/output` in place is not a valid test.

**Schema changes:** Update `supabase/schema.sql`, sync `packages/types/src/database.types.ts`, push via db:push or the SQL editor, then update `@minute-menus/supabase-service` field mappings and `@minute-menus/types` if domain shapes change.

**Legacy mockData:** Exists for early prototyping only. Do not add new features there or route production flows through it.

**localStorage:** Not for app data. The only acceptable exception is the short-lived pending-restaurant-name flag after OAuth registration.

---

## How auth should work

- Owners authenticate via Supabase (Google OAuth or email/password) on the login page; App.tsx holds session state and redirects into the dashboard.
- OAuth redirect URLs must match VITE_SITE_URL in production.
- Customers have a separate auth modal flow inside the customer app (sign-up, sign-in, OTP, profile completion) — methods live in supabase-service customer-auth section.
- Sign-out clears the Supabase session and returns to landing.

When adding auth-related features, follow existing Supabase Auth patterns rather than introducing a second auth library.

---

## How the menu editor should work

- Categories contain dishes; each dish supports name, description, price, image or video media, optional crop/transform, daily stock SKU, and manual sold-out flag.
- Local edits set an unsaved-changes flag; the save button persists the **entire** menu tree through supabase-service → `@minute-menus/menu-persistence`.
- Do not background-refresh menu data on a timer — only load on mount (and after a successful save if reload is ever needed).
- Never replace in-memory menu state with a server fetch while unsaved changes exist.
- Use `@minute-menus/ui` for menu loading and save-in-progress states.
- Surface save errors with `@minute-menus/errors` — Supabase failures are not standard Error instances.

When changing the Dish or Category shape: update `@minute-menus/types`, schema/seed if columns change, menu-persistence row mapping, supabase-service mappers, and owner dashboard editor fields.

---

## How analytics and subscriptions should work

- Watch sessions and orders feed owner analytics; `@minute-menus/metrics` builds aggregates from Supabase query results inside supabase-service.
- Subscription features (meal plans, daily orders, delivery tickets, refunds) have dedicated supabase-service methods and owner-dashboard tabs.
- Meal plan saves use `@minute-menus/meal-plan-persistence`.
- Plus-tier features use the existing paywall modal pattern — gate in UI and respect UserTier state.
- Scheduled digest and auto-delivery jobs are Vercel crons in vercel.json; they call API routes using the admin client and `lib/server/` mail and email-template helpers.

---

## How AI features should work

Production AI lives in `@minute-menus/ai` (Anthropic Claude). Capabilities include analytics narrative reports and short marketing copy generation. The app-root `services/geminiService.ts` is a re-export shim only.

When adding a new AI call:

- Add it to `@minute-menus/ai` (or a submodule there if scope is large).
- Use the same pinned model unless the user explicitly requests a change.
- Check for a missing ANTHROPIC_API_KEY before calling the API **on the server only**.
- Use `@minute-menus/logger` on failure; return a safe fallback string — never throw uncaught errors to the UI.
- **Never** put provider keys in the browser bundle (`vite.config` `define`, `VITE_ANTHROPIC_*`, `dangerouslyAllowBrowser`). See `.cursor/rules/ai-api-key-security.mdc`.
- Storage guide / costing owner keys: accept in UI → persist to `owner_settings` → call Anthropic from `api/**` with that key; client only learns `hasAnthropicApiKey`.

---

## How to edit the owner dashboard

The file is thousands of lines with inline subcomponents. **Search for the section you need** instead of reading top to bottom. Loading and save UI should use `@minute-menus/ui`. Preserve the inline-component pattern unless extracting clearly reduces duplication.

User tier defaults to FREE; Plus upgrades go through Razorpay (`create-plus-order` + `confirm-payment?action=confirm-plus`) with owner auth. Gates must stay enforced for Free (no sessionStorage “show once” bypass). `getTier` respects `current_period_end`; keepalive expires lapsed Plus rows.

---

## How to add a new feature (checklist)

1. Define or extend types in `@minute-menus/types`.
2. Add database tables/columns/policies in `supabase/schema.sql` if persistence is needed; update `@minute-menus/types/db`.
3. Add service methods in `@minute-menus/supabase-service` (browser) and/or server logic in `lib/server/` exposed through an **existing** `api/` route via `?action=` — the project is at the 12-function cap, so never add an `api/` file. Follow the import rules in `.claude/rules/vercel-api.md`.
4. Extract reusable logic into the appropriate workspace package — do not grow app-root files when a package already exists for that concern.
5. Wire UI in CustomerApp or OwnerDashboard; use `@minute-menus/reels` or `@minute-menus/ui` where applicable.
6. Add env vars to `.env.example` with a one-line comment — never commit secrets.
7. If Plus-only, wrap with the paywall modal pattern.
8. Run **pnpm install** (if new package) and **pnpm build**; if any API route can reach the change, also **pnpm verify:api** (Node 24) and, after deploy, confirm changed routes don't return `500 FUNCTION_INVOCATION_FAILED`.

---

## Testing and scripts

- Seed and reset scripts write to Supabase using the service role; clear state between test runs if reusing a shared project.
- Email test script validates SMTP configuration via API routes.
- Mock Anthropic calls in tests; verify fallback behavior when the API key is absent.

---

## Out of scope without discussion

| Rule | Reason |
|---|---|
| Removing or raising the customer reel dish display limit | Hard product requirement |
| Changing the pinned Claude model | Cost and latency pin |
| Replacing Supabase auth or bypassing RLS | Security and multi-tenant isolation |
| Adding a global state library | Architectural constraint |
| Committing .env or service role keys | Security |
| Duplicating package code in app root instead of extending packages | DRY and workspace conventions |
| Adding a new `api/*.ts` file when already at 12 serverless functions | Vercel Hobby deploy will fail — consolidate routes first |
| Runtime `@minute-menus/*` imports or extensionless relative imports in code an API route reaches | Crashes the function at load in production (`FUNCTION_INVOCATION_FAILED`) even though build and dev pass |

---

## Suggested safe extensions

- Customer reel search or filter
- Persistent category scroll position in the customer view
- Owner order history view from existing orders table
- Marketing copy generation hooked into the menu editor UI (via `@minute-menus/ai`)
- CSV export gated behind Plus (pattern already exists for other Plus features)
