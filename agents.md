# agents.md — AI Agent Guide for Minute Menus

> Task-level rules for coding agents. Project orientation and file map live in CLAUDE.md. Cursor loads this file and `.cursor/rules/` automatically. **Do not paste code into these docs** — describe patterns here; implement in source files.

## Engineering standards

Canonical guidance lives in **`.claude/rules/coding-standards.md`** (global bar), **`.claude/rules/typescript-conventions.md`**, and **`.claude/rules/react-conventions.md`**. In Cursor, the always-applied **`.cursor/rules/coding-standards.mdc`** mirrors the condensed global rules; **`.cursor/rules/typescript-conventions.mdc`** and **`.cursor/rules/react-conventions.mdc`** attach to plain TypeScript and TSX surfaces respectively.

Interpret **SOLID** as: **S**ingle responsibility per module; **O**pen for extension through clear seams rather than editing many concerns in one place; **L**iskov-safe substitutability where types model behavior; **I**nterface segregation so callers depend on narrow contracts; **D**ependency inversion so integrations depend on stable abstractions. Pair that with **DRY**, **KISS**, **YAGNI**, and **fail-fast** validation at boundaries (with graceful UX only where product rules demand it).

Respect cyclomatic complexity limits (**functions and plain .ts:** 6, **TSX:** 11). Ship **minimal scoped diffs**; match existing naming, structure, and Tailwind patterns. Aim for sub-2-second load performance where the SPA already targets it.

---

## How data should work

**Browser (customer and owner UI):** All reads and writes go through the Supabase service module. It resolves the current restaurant from the authenticated session (owners) or from the slug/restaurant ID passed into the customer app.

**Server (Vercel API routes):** Use the admin Supabase client with the service role key. Never import or expose that key in client-side code.

**Schema changes:** Update supabase/schema.sql, regenerate or adjust lib/database.types.ts if needed, push via db:push or the Supabase SQL editor, then update types.ts and the service layer mappings.

**Legacy mockData:** Exists for early prototyping only. Do not add new features there or route production flows through it.

**localStorage:** Not for app data. The only acceptable exception is the short-lived pending-restaurant-name flag after OAuth registration.

---

## How auth should work

- Owners authenticate via Supabase (Google OAuth or email/password) on the login page; App.tsx holds session state and redirects into the dashboard.
- OAuth redirect URLs must match VITE_SITE_URL in production.
- Customers have a separate auth modal flow inside the customer app (sign-up, sign-in, OTP, profile completion).
- Sign-out clears the Supabase session and returns to landing.

When adding auth-related features, follow existing Supabase Auth patterns rather than introducing a second auth library.

---

## How the menu editor should work

- Categories contain dishes; each dish supports name, description, price, image or video media, optional crop/transform, daily stock SKU, and manual sold-out flag.
- Local edits set an unsaved-changes flag; the save button persists the **entire** menu tree to the database.
- Do not background-refresh menu data on a timer — only load on mount (and after a successful save if reload is ever needed).
- Never replace in-memory menu state with a server fetch while unsaved changes exist.
- Deleting a dish from the UI and saving removes it from the database; partial payloads can delete data unintentionally — always save the complete current menu.
- Media may be external URLs or processed uploads; optional transform metadata must be treated as nullable everywhere.

When changing the Dish or Category shape: update types.ts, schema/seed if columns change, service layer field mapping, and all menu editor spreads in the owner dashboard.

---

## How analytics and subscriptions should work

- Watch sessions and orders feed owner analytics; metrics are aggregated in the service layer from Supabase tables, not external analytics SDKs.
- Subscription features (meal plans, daily orders, delivery tickets, refunds) have dedicated service methods and owner-dashboard tabs.
- Plus-tier features use the existing paywall modal pattern — gate in UI and respect UserTier state.
- Scheduled digest and auto-delivery jobs are Vercel crons defined in vercel.json; they call API routes that use the admin client and SMTP where applicable.

---

## How AI features should work

Production AI lives in services/geminiService.ts (Anthropic Claude). Current capabilities include analytics narrative reports and short marketing copy generation.

When adding a new AI call:

- Keep it in the geminiService module (or a sibling service file if scope is large).
- Use the same pinned model unless the user explicitly requests a change.
- Check for a missing ANTHROPIC_API_KEY before calling the API.
- On failure, log the error and return a safe fallback string — never throw uncaught errors to the UI.
- Copy the guard-and-fallback pattern from the existing functions in that file rather than inventing a new error strategy.

---

## How to edit the owner dashboard

The file is thousands of lines with inline subcomponents (paywall modal, stat cards, menu editor, subscription panels). **Search for the section you need** instead of reading top to bottom. Preserve the inline-component pattern unless extracting a component clearly reduces duplication.

User tier defaults to FREE; upgrade flow is simulated until payment integration is completed.

---

## How to add a new feature (checklist)

1. Define or extend types in types.ts.
2. Add database tables/columns/policies in supabase/schema.sql if persistence is needed.
3. Add service-layer methods in supabaseService.ts (browser) and/or an API route (server-only logic).
4. Wire UI in CustomerApp or OwnerDashboard as appropriate.
5. Add env vars to .env.example with a one-line comment — never commit secrets.
6. If Plus-only, wrap with the paywall modal pattern.

---

## Testing and scripts

- Seed and reset scripts write to Supabase using the service role; clear state between test runs if reusing a shared project.
- Email test script validates SMTP configuration.
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

---

## Suggested safe extensions

- Customer reel search or filter
- Persistent category scroll position in the customer view
- Owner order history view from existing orders table
- Marketing copy generation hooked into the menu editor UI
- CSV export gated behind Plus (pattern already exists for other Plus features)
