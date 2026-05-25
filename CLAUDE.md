# CLAUDE.md — Minute Menus

> Lean orientation for AI assistants. Read this first; grep source files only for the task at hand. Workflow rules live in `agents.md`.

## What this is

A restaurant platform with TikTok-style dish reels for customers and an owner dashboard for menu management, analytics, subscriptions, and QR-based multi-tenant access. Each restaurant has a public slug URL.

## How to work in this repo

- Prefer **grep and targeted reads** over loading large files wholesale (especially the owner dashboard and Supabase service layer).
- Keep diffs **minimal and scoped** — no drive-by refactors.
- Follow **`.claude/rules/`**: `coding-standards.md` (global norms), `typescript-conventions.md` (plain `.ts`), and `react-conventions.md` (TSX, `components/**`, `pages/**`). Cursor also loads **`.cursor/rules/coding-standards.mdc`** (always-on) plus scoped **`typescript-conventions.mdc`** and **`react-conventions.mdc`** — use them for SOLID discipline, fail-fast stance, Tailwind/React patterns, and cyclomatic complexity limits (functions and .ts: 6, TSX: 11).
- Target **under 2 seconds** initial load; use React hooks only for state; Tailwind only for styling.

## Commands

- **pnpm dev** — local Vite dev server
- **pnpm build** — production build
- **pnpm seed** — seed Supabase (requires service role env vars)
- **pnpm db:push** — apply database schema via Supabase Management API

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS (dark/light theme) |
| Charts | Recharts |
| Icons | lucide-react |
| Database & Auth | Supabase (Postgres, RLS, Auth) |
| Serverless APIs | Vercel functions + crons |
| Email | Nodemailer (Outlook SMTP) |
| Payments | Razorpay (India); Clover planned (US/CA) |
| AI | Anthropic Claude via services/geminiService.ts |
| QR codes | qrcode.react |
| Package manager | pnpm |

## Where things live

| Area | Primary file(s) |
|---|---|
| App routing, auth session, slug-based customer entry | App.tsx |
| Customer reels, cart, checkout, customer auth | pages/CustomerApp.tsx |
| Owner dashboard, menu editor, paywall, subscriptions admin | pages/OwnerDashboard.tsx (very large — grep first) |
| Owner login (Google OAuth, email/password) | pages/LoginPage.tsx |
| All production browser-side data access | services/supabaseService.ts |
| Browser Supabase client | lib/supabase.ts |
| Server-side Supabase (API routes only) | lib/supabase-admin.ts |
| Database schema, RLS policies, RPC functions | supabase/schema.sql |
| AI-generated insights and marketing copy | services/geminiService.ts |
| Shared TypeScript interfaces | types.ts |
| Generated DB types | lib/database.types.ts |
| Scheduled jobs | vercel.json |
| Environment variable names | .env.example |
| Legacy local mock layer (not used in production) | mockData.ts — do not extend |

## How the app flows

**Customer path:** Landing or QR slug opens the reel viewer for one restaurant. Dishes scroll vertically; watch time and orders are recorded. Cart and checkout do not require owner login.

**Owner path:** Landing → login (Supabase session) → dashboard. Owners manage menu content, view analytics, handle subscriptions, and generate QR codes.

**Server path:** Vercel API routes handle email, payments, subscription crons, sold-out notifications, and Supabase keepalive. These use the admin Supabase client and must never expose the service role key to the browser.

## Data and auth rules

- **Production data** goes through the Supabase service layer or Supabase clients — not mockData, not direct localStorage (except one pending-restaurant-name flag used briefly after OAuth signup).
- **Auth** is Supabase Auth: Google OAuth and email/password for owners; separate customer flows in the customer app including OTP verification.
- **Multi-tenancy** is enforced by Postgres RLS tied to restaurant ownership and public read policies for customer-facing menu data.
- **Menu saves are destructive syncs:** saving sends the full menu tree; anything omitted from the payload may be deleted server-side.

## Menu editor — important behavior

- Menu loads once on mount; it is **not** refreshed on the same interval as analytics.
- While the owner has **unsaved changes**, do not overwrite local menu state from the server.
- Saving is **explicit** via the Save Changes control; renaming a category marks unsaved state but does not auto-persist.
- Show loading state while the menu fetch is in flight; show save-in-progress on the save action.

## AI integration

All AI calls live in the geminiService module (Anthropic Claude under the hood). The model name is pinned for cost and speed. Missing API keys or failed requests must degrade to friendly fallback text — never break the UI.

## Do not change without explicit approval

- The hard cap on dishes shown in the customer reel view (product requirement)
- The pinned Claude model identifier
- Supabase RLS policies without a deliberate migration and security review

## Operations note

Supabase free-tier projects pause after prolonged inactivity, which breaks OAuth until resumed. Production uses a daily keepalive cron; Supabase Pro or self-hosting is the long-term fix.

## Cursor IDE context

Cursor auto-loads **CLAUDE.md** and **agents.md** from the project root. Additional rules live under **`.claude/rules/`** (canonical prose for assistants) and **`.cursor/rules/`** (including always-applied `coding-standards.mdc`, project context, Supabase, owner dashboard, API routes, and customer-app rules). Prefer those docs over re-explaining architecture in chat.

## When stuck

1. Grep for the symbol or UI label in the owner dashboard or Supabase service.
2. Read the relevant section of supabase/schema.sql for tables, policies, and RPCs.
3. Check .env.example for required configuration.
4. See agents.md for step-by-step agent workflows.
