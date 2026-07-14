# CLAUDE.md — Minute Menus

> Lean orientation for AI assistants. Read this first; grep source files only for the task at hand. Workflow rules live in `agents.md`. Workspace package map: **`.cursor/rules/workspace-packages.mdc`**.

## What this is

A restaurant platform with TikTok-style dish reels for customers and an owner dashboard for menu management, analytics, subscriptions, and QR-based multi-tenant access. Each restaurant has a public slug URL.

## How to work in this repo

- Prefer **grep and targeted reads** over loading large files wholesale (especially the owner dashboard and Supabase service package).
- Keep diffs **minimal and scoped** — no drive-by refactors.
- Follow **`.claude/rules/`**: `coding-standards.md`, `typescript-conventions.md`, `react-conventions.md`, `workspace-packages.md`. Cursor loads **`.cursor/rules/`** including `workspace-packages.mdc`.
- Respect cyclomatic complexity limits (functions and plain `.ts`: 6, TSX: 11).
- Target **under 2 seconds** initial load; use React hooks only for state; Tailwind only for styling.

## Commands

- **pnpm dev** — local Vite dev server
- **pnpm build** — production build (links all workspace packages)
- **pnpm install** — required after pull when packages change
- **pnpm seed** — seed Supabase (requires service role env vars)
- **pnpm db:push** — apply database schema via Supabase Management API

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Monorepo | pnpm workspace (`packages/*`) |
| Styling | Tailwind CSS (dark/light theme) |
| Charts | Recharts |
| Icons | lucide-react |
| Database & Auth | Supabase (Postgres, RLS, Auth) |
| Serverless APIs | Vercel functions + crons |
| Email | Brevo SMTP via `@minute-menus/mailer` |
| Payments | Razorpay via `@minute-menus/payments` |
| AI | Anthropic Claude via `@minute-menus/ai` |
| QR codes | qrcode.react |
| Package manager | pnpm |

## Workspace packages (summary)

Shared code lives under `packages/`. Import by scope (e.g. `@minute-menus/types`), not relative paths across package boundaries.

| Package | Role |
|---|---|
| `types` (+ `/db`) | Domain types and generated Supabase schema types |
| `supabase-service` | Full browser data layer (`createSupabaseService`) |
| `menu-persistence` / `meal-plan-persistence` | Menu and meal-plan DB sync |
| `metrics` | Pure analytics aggregation builders |
| `ui` | Loaders, spinners, save button |
| `reels` | Customer reel card components |
| `currency` / `errors` / `logger` | Formatting, error messages, scoped logging |
| `ai` | Claude insights and marketing copy |
| `mailer` / `email-templates` / `api-helpers` / `payments` | Server API infrastructure |

Full map and extension guide: **`.cursor/rules/workspace-packages.mdc`**.

## Where things live

| Area | Primary location |
|---|---|
| App routing, auth session, slug-based customer entry | `App.tsx` |
| Customer reels, cart, checkout, customer auth | `pages/CustomerApp.tsx` |
| Owner dashboard, menu editor, paywall, subscriptions | `pages/OwnerDashboard.tsx` (very large — grep first) |
| Owner login | `pages/LoginPage.tsx` |
| Browser data access (facade) | `services/supabaseService.ts` → `@minute-menus/supabase-service` |
| Data layer implementation | `packages/supabase-service/src/` |
| Browser Supabase client | `lib/supabase.ts` |
| Server Supabase (API routes only) | `lib/supabase-admin.ts` |
| Database schema, RLS, RPCs | `supabase/schema.sql` |
| AI (facade) | `services/geminiService.ts` → `@minute-menus/ai` |
| Reel UI | `@minute-menus/reels` |
| Shared types | `@minute-menus/types` |
| DB types (generated) | `@minute-menus/types/db` (shim: `lib/database.types.ts`) |
| Vercel API routes | `api/` |
| Scheduled jobs | `vercel.json` |
| Environment variable names | `.env.example` |
| Legacy mock layer | `mockData.ts` — do not extend |

## How the app flows

**Customer path:** Landing or QR slug opens the reel viewer for one restaurant. Dishes scroll vertically; watch time and orders are recorded. Cart and checkout do not require owner login.

**Owner path:** Landing → login (Supabase session) → dashboard. Owners manage menu content, view analytics, handle subscriptions, and generate QR codes.

**Server path:** Vercel API routes handle email, payments, subscription crons, sold-out notifications, and Supabase keepalive. These use the admin Supabase client and workspace packages for mail, templates, payments, and logging. Never expose the service role key to the browser.

**Vercel deploy constraint:** Hobby plan — **max 12 serverless functions** (one `api/**/*.ts` file each). Currently at 12/12. New server endpoints must merge into existing routes (`?action=`) or replace one. See `.cursor/rules/vercel-api-and-crons.mdc`.

## Data and auth rules

- **Production data** goes through `@minute-menus/supabase-service` (via the app wrapper) or Supabase clients — not mockData, not direct localStorage (except one pending-restaurant-name flag after OAuth signup).
- **Auth** is Supabase Auth: Google OAuth and email/password for owners; separate customer flows in the customer app including OTP verification.
- **Multi-tenancy** is enforced by Postgres RLS tied to restaurant ownership and public read policies for customer-facing menu data.
- **Menu saves are destructive syncs:** saving sends the full menu tree via `@minute-menus/menu-persistence`; anything omitted from the payload may be deleted server-side.

## Menu editor — important behavior

- Menu loads once on mount; it is **not** refreshed on the same interval as analytics.
- While the owner has **unsaved changes**, do not overwrite local menu state from the server.
- Saving is **explicit** via the Save Changes control (`@minute-menus/ui`); show loading during fetch and save.
- Use `@minute-menus/errors` for user-facing save failure messages.

## AI integration

All AI calls live in `@minute-menus/ai` (Anthropic Claude). The model name is pinned for cost and speed. Missing API keys or failed requests must degrade to friendly fallback text — never break the UI.

## Do not change without explicit approval

- The hard cap on dishes shown in the customer reel view (product requirement)
- The pinned Claude model identifier
- Supabase RLS policies without a deliberate migration and security review
- Adding net-new Vercel serverless functions beyond **12 total** without consolidation or Pro plan upgrade

## Operations note

Supabase free-tier projects pause after prolonged inactivity, which breaks OAuth until resumed. Production uses a daily keepalive cron; Supabase Pro or self-hosting is the long-term fix.

## Cursor IDE context

Cursor auto-loads **CLAUDE.md** and **agents.md**. Rules under **`.cursor/rules/`** include project context, Supabase, API routes, owner dashboard, customer app, and **workspace-packages.mdc**. Prefer those docs over re-explaining architecture in chat.

## When stuck

1. Grep the relevant package under `packages/` or the owner dashboard page.
2. Read the relevant section of `supabase/schema.sql` for tables, policies, and RPCs.
3. Check `.env.example` for required configuration.
4. See `agents.md` for step-by-step agent workflows and the feature checklist.
