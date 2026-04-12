# Minute Menus — Engineering Change Log · 12 April 2026

> Covers three feature areas delivered in this session:
> 1. **Subscription Model** — full meal-plan lifecycle for restaurants and customers
> 2. **Customer Directory** — searchable, paginated CRM table in the owner dashboard
> 3. **Analytics Report Generation** — internal-data-only AI report replacing the old 3-bullet insight

---

## Table of Contents

1. [Architecture Overview (HLD)](#1-architecture-overview-hld)
2. [Subscription Model](#2-subscription-model)
   - [Domain Model](#21-domain-model)
   - [Database Schema (LLD)](#22-database-schema-lld)
   - [Server-Side API Routes](#23-server-side-api-routes)
   - [Vercel Crons (Scheduled Jobs)](#24-vercel-crons-scheduled-jobs)
   - [Service Layer](#25-service-layer)
   - [Owner Dashboard UI](#26-owner-dashboard-ui)
   - [Customer App UI](#27-customer-app-ui)
3. [Customer Directory](#3-customer-directory)
   - [Data Model](#31-data-model)
   - [Service Method](#32-service-method)
   - [UI](#33-ui)
4. [Analytics Report Generation](#4-analytics-report-generation)
   - [Decision: Internal Data vs GA4](#41-decision-internal-data-vs-ga4)
   - [Data Model](#42-data-model)
   - [Service Method (buildAnalyticsReport)](#43-service-method-buildanalyticsreport)
   - [AI Layer (geminiService)](#44-ai-layer-geminiservice)
   - [UI Changes](#45-ui-changes)
5. [Files Changed](#5-files-changed)
6. [Environment Variables](#6-environment-variables)
7. [Deployment Notes](#7-deployment-notes)

---

## 1. Architecture Overview (HLD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React 19 SPA)                     │
│                                                                       │
│  CustomerApp.tsx          OwnerDashboard.tsx                          │
│  ┌──────────────────┐    ┌──────────────────────────────────────┐    │
│  │ Reel viewer       │    │ Analytics │ Menu │ Customers │ Subs  │    │
│  │ Cart + checkout   │    │ tab       │ tab  │ tab       │ tab   │    │
│  │ Subscription panel│    └──────────────────────────────────────┘    │
│  └──────────────────┘                                                 │
└──────────────┬──────────────────────────────┬────────────────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐   ┌──────────────────────────────────────┐
│   services/              │   │   services/geminiService.ts           │
│   supabaseService.ts     │   │   (Anthropic claude-sonnet-4-5)       │
│   (all DB ops, singleton)│   │   generateAnalyticsReport()           │
└───────────┬──────────────┘   │   generateMarketingCopy()             │
            │                  └──────────────────────────────────────┘
            ▼
┌──────────────────────────┐
│   Supabase PostgreSQL    │
│   (18 tables, RLS, RPCs) │
└──────────────────────────┘
            ▲
            │ service_role (bypasses RLS)
┌──────────────────────────┐
│   api/ (Vercel Functions)│
│   subscription/           │
│   ├── daily-digest.ts    │  ← cron: 11:35 UTC daily
│   ├── auto-deliver.ts    │  ← cron: 04:00 / 09:00 / 16:00 UTC
│   └── cancel-order.ts    │  ← POST from owner dashboard
└──────────────────────────┘
            │ sends emails via
            ▼
┌──────────────────────────┐
│   Resend (email service) │
└──────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Customer identity for subscriptions | Phone number (no auth) | Lowest friction for restaurant customers; no passwords to manage |
| Auth for mutations | SECURITY DEFINER RPCs | Validates phone ownership server-side without a token |
| Scheduled jobs | Vercel Cron (Pro plan required) | Already deployed on Vercel; no separate worker infra |
| Analytics data source | Internal Supabase only | Restaurant-specific KPIs (dish-level conversion, subscription health) are more actionable than generic GA4 web metrics |
| AI model | `claude-sonnet-4-5` (Anthropic) | Pinned per project convention; cost/speed balance |
| Timezone | All IST (UTC+5:30) expressed as UTC | Cron schedules and cutoff logic stored/compared in UTC |

---

## 2. Subscription Model

### 2.1 Domain Model

```
Restaurant
  └─ MealPlan (1:N)
       └─ MealPlanDish (N:N, junction) ─── Dish
  └─ CustomerSubscription (1:N, unique: restaurant_id + phone)
       └─ DailyOrder (1:N, unique: subscription_id + delivery_date)
       └─ RefundRequest (1:N)
  └─ DeliveryTicket (1:N, references DailyOrder)
       └─ DeliveryAdjustment (1:N)
```

**Lifecycle states:**

```
CustomerSubscription.status
  active ──pause──► paused (max 7 days/cycle, tracked by paused_days_used)
  paused ──resume──► active
  active/paused ──cancel──► cancelled (creates RefundRequest)

DailyOrder.status
  pending ──select dish──► pending (dish_id/dish_name filled)
  pending ──cron/auto──► delivered
  pending ──owner cancel──► cancelled (cancelled_by = 'restaurant')
  pending ──past cutoff + no selection──► skipped

DeliveryTicket.status
  open ──► investigating ──► resolved (with DeliveryAdjustment note)

RefundRequest.status
  pending ──► approved ──► processed
  pending ──► rejected
```

### 2.2 Database Schema (LLD)

Six new tables added to `supabase/schema.sql` (tables 11–16) plus two SECURITY DEFINER RPCs.

#### Table 11: `meal_plans`

```sql
id             uuid PK
restaurant_id  uuid FK restaurants
name           text NOT NULL
description    text DEFAULT ''
price_monthly  numeric(10,2) DEFAULT 0
delivery_fee   numeric(10,2) DEFAULT 0   -- 0 = free delivery
is_active      boolean DEFAULT true
created_at     timestamptz DEFAULT now()
```

RLS: Owner full access · Public SELECT (active only).

#### Table 11b: `meal_plan_dishes` (junction)

```sql
plan_id  uuid FK meal_plans  (cascade delete)
dish_id  uuid FK dishes      (cascade delete)
PRIMARY KEY (plan_id, dish_id)
```

RLS: Owner manages · Public SELECT.

#### Table 12: `customer_subscriptions`

```sql
id               uuid PK
restaurant_id    uuid FK restaurants
plan_id          uuid FK meal_plans
customer_name    text NOT NULL
phone            text NOT NULL
email            text
delivery_type    sub_delivery_type ENUM(delivery, pickup)
time_slot        sub_time_slot     ENUM(08-09, 12-14, 19-21)
status           sub_status        ENUM(active, paused, cancelled)  DEFAULT active
pause_until      date
paused_days_used integer DEFAULT 0
start_date       date NOT NULL
end_date         date NOT NULL       -- start + 30 days
created_at       timestamptz DEFAULT now()
UNIQUE (restaurant_id, phone)        -- one active sub per phone per restaurant
```

RLS: Owner full access · Public INSERT (subscribe) · Public SELECT (own phone lookup).

#### Table 13: `subscription_daily_orders`

```sql
id                   uuid PK
subscription_id      uuid FK customer_subscriptions
restaurant_id        uuid FK restaurants
delivery_date        date NOT NULL
dish_id              uuid FK dishes (nullable — not yet selected)
dish_name            text DEFAULT ''
status               daily_order_status ENUM(pending, delivered, cancelled, skipped)
cancelled_by         text               -- 'restaurant' | 'customer'
cancellation_reason  text
created_at           timestamptz DEFAULT now()
updated_at           timestamptz DEFAULT now()
UNIQUE (subscription_id, delivery_date)
```

RLS: Owner full access · Public INSERT · Public SELECT.

#### Table 14: `subscription_refund_requests`

```sql
id               uuid PK
subscription_id  uuid FK customer_subscriptions
restaurant_id    uuid FK restaurants
reason           text NOT NULL
amount           numeric(10,2) DEFAULT 0
status           refund_status ENUM(pending, approved, rejected, processed)
restaurant_notes text
created_at       timestamptz DEFAULT now()
processed_at     timestamptz
```

#### Table 15: `delivery_tickets`

```sql
id               uuid PK
subscription_id  uuid FK customer_subscriptions
daily_order_id   uuid FK subscription_daily_orders
restaurant_id    uuid FK restaurants
reason           ticket_reason ENUM(not_received, wrong_item, partial_delivery, damaged, late_delivery, other)
notes            text
status           ticket_status ENUM(open, investigating, resolved)  DEFAULT open
created_at       timestamptz DEFAULT now()
```

#### Table 16: `delivery_adjustments`

```sql
id         uuid PK
ticket_id  uuid FK delivery_tickets (cascade delete)
notes      text NOT NULL
created_at timestamptz DEFAULT now()
```

#### RPC 17: `upsert_daily_selection(p_phone, p_restaurant_id, p_delivery_date, p_dish_id)`

- Validates phone matches an active subscription in the restaurant
- Checks dish is in the subscription's meal plan
- Enforces 5 PM IST cutoff: `now() AT TIME ZONE 'UTC' > (delivery_date - 1) || ' 11:30:00'::timestamptz`
- UPSERTs a `subscription_daily_orders` row
- Returns a text status message
- SECURITY DEFINER, granted to `anon, authenticated`

#### RPC 18: `update_subscription_status(p_phone, p_restaurant_id, p_new_status, p_pause_until?, p_cancel_reason?)`

- Validates phone lookup
- Pause: enforces `pause_until - now() <= 7 days`, increments `paused_days_used`
- Cancel: creates `subscription_refund_requests` row with pro-rated amount
- SECURITY DEFINER, granted to `anon, authenticated`

### 2.3 Server-Side API Routes

All under `api/subscription/`. Use `lib/supabase-admin.ts` (service role key, bypasses RLS).

#### `api/subscription/daily-digest.ts` — GET

Called by cron at **11:35 UTC (5:05 PM IST)** daily.

```
1. Query subscription_daily_orders WHERE delivery_date = tomorrow AND status = pending
   JOIN customer_subscriptions (customer_name, phone, time_slot, delivery_type)
2. GROUP by restaurant_id
3. For each restaurant → auth.admin.getUserById(owner_id) → get owner email
4. Send HTML email via Resend listing all orders grouped by time slot
```

#### `api/subscription/auto-deliver.ts` — GET `?slot=08-09|12-14|19-21`

Called by three crons. Bulk-marks pending orders as delivered after each slot window closes.

```
1. Validate ?slot query param
2. Find active customer_subscriptions with matching time_slot
3. Bulk UPDATE subscription_daily_orders
   SET status = 'delivered'
   WHERE delivery_date = today AND status = pending AND subscription_id IN (...)
```

#### `api/subscription/cancel-order.ts` — POST

Called from owner dashboard when cancelling a daily order.

```
Body: { subscriptionId, restaurantId, deliveryDate, dishName, reason, customerEmail, customerName }

1. Look up restaurant → owner email
2. UPDATE subscription_daily_orders SET status = cancelled, cancelled_by = 'restaurant'
3. Send cancellation email to customer (if email on file)
4. Send cancellation notification to owner
```

### 2.4 Vercel Crons (Scheduled Jobs)

```json
[
  { "path": "/api/subscription/daily-digest",        "schedule": "35 11 * * *" },
  { "path": "/api/subscription/auto-deliver?slot=08-09", "schedule": "0 4 * * *" },
  { "path": "/api/subscription/auto-deliver?slot=12-14", "schedule": "0 9 * * *" },
  { "path": "/api/subscription/auto-deliver?slot=19-21", "schedule": "0 16 * * *" }
]
```

IST ↔ UTC mapping (UTC+5:30):

| Event | IST | UTC |
|---|---|---|
| Daily cutoff | 5:00 PM | 11:30 |
| Daily digest email | 5:05 PM | 11:35 |
| Morning slot closes | 9:00 AM | 03:30 → cron at 04:00 |
| Lunch slot closes | 2:00 PM | 08:30 → cron at 09:00 |
| Evening slot closes | 9:00 PM | 15:30 → cron at 16:00 |

> **Requires Vercel Pro plan** for cron support.

### 2.5 Service Layer

All methods added to `SupabaseService` class in `services/supabaseService.ts`.

**Owner-side methods:**

| Method | Description |
|---|---|
| `getMealPlans(restaurantId?)` | Fetches plans with dish IDs |
| `saveMealPlan(plan, id?)` | INSERT or UPDATE + syncs `meal_plan_dishes` junction |
| `deleteMealPlan(planId)` | Deletes plan (cascade to junction + orders) |
| `getCustomerSubscriptions(restaurantId?)` | All subs joined with `meal_plans(name)` |
| `getTomorrowsOrders(restaurantId?)` | Non-cancelled orders for tomorrow |
| `cancelDailyOrder(orderId, reason)` | Updates status + fires cancel-order email (best-effort) |
| `getDeliveryTickets(restaurantId?)` | Tickets with `delivery_adjustments(*)` join |
| `resolveDeliveryTicket(ticketId, notes)` | Sets status=resolved + inserts DeliveryAdjustment |
| `getRefundRequests(restaurantId?)` | All refund requests |
| `updateRefundStatus(refundId, status, notes?)` | Approve / reject / process |

**Customer-side methods (no auth — phone-based):**

| Method | Description |
|---|---|
| `getCustomerSubscription(phone, restaurantId)` | Single active sub lookup |
| `createCustomerSubscription(params)` | INSERT with end_date = start + 30 days |
| `selectDailyDish(phone, restaurantId, date, dishId)` | Calls `upsert_daily_selection` RPC |
| `pauseSubscription(phone, restaurantId, pauseUntil)` | Calls `update_subscription_status` RPC |
| `resumeSubscription(phone, restaurantId)` | Calls `update_subscription_status` RPC |
| `cancelCustomerSubscription(phone, restaurantId, reason)` | Calls `update_subscription_status` RPC |
| `getCustomerDailyOrders(subscriptionId, fromDate)` | Orders from date onwards |
| `raiseDeliveryTicket(params)` | INSERT into `delivery_tickets` |

### 2.6 Owner Dashboard UI

New `SUBSCRIPTIONS` view in `OwnerDashboard.tsx` with five sub-tabs:

```
Subscriptions
├── Plans       — Create/edit/delete meal plans (modal form with dish multi-select, price, delivery fee)
├── Subscribers — Table: all customers with name, phone, plan, status badge, time slot, end date
├── Tomorrow    — Daily orders grouped by time slot; per-order Cancel button → prompt for reason
├── Tickets     — Delivery dispute tickets; unread count badge; Resolve button + notes input
└── Refunds     — Refund requests; pending count badge; Approve / Reject / Process buttons
```

State additions to `OwnerDashboard`:
```typescript
subTab: SubTab                 // "plans" | "subscribers" | "tomorrow" | "tickets" | "refunds"
mealPlans: MealPlan[]
customerSubs: CustomerSubscription[]
tomorrowOrders: DailyOrder[]
deliveryTickets: DeliveryTicket[]
refundRequests: RefundRequest[]
editingPlan: Partial<MealPlan> | null  // null = modal closed
```

All subscription data loaded in `refreshData()` alongside existing analytics data.

### 2.7 Customer App UI

Bookmark icon (🔖) added to the header opens a right-drawer Subscription Panel.

**Flow:**

```
PhoneLookup
  ├── [existing sub] ──► ManageView
  └── [no sub]       ──► PlansView ──► SubscribeForm ──► ManageView
```

**ManageView sections:**

| Section | Condition | Behaviour |
|---|---|---|
| Status card | always | Shows plan, status badge, delivery type, time slot, end date |
| Tomorrow's dish | status=active, before 5PM IST | Dish buttons from plan; selected = highlighted white |
| Pause delivery | status=active | Date picker (max 7 days); calls `pauseSubscription` RPC |
| Resume | status=paused | Single button; calls `resumeSubscription` RPC |
| Report an issue | has delivered orders | Reason dropdown + notes; delivery selector dropdown |
| Cancel subscription | status ≠ cancelled | Reason textarea → `cancelCustomerSubscription` RPC → creates refund request |

**IST cutoff check (client-side):**
```typescript
const isPastCutoff = () => {
  const now = new Date();
  return now.getUTCHours() > 11 || (now.getUTCHours() === 11 && now.getUTCMinutes() >= 30);
};
```

---

## 3. Customer Directory

### 3.1 Data Model

New interface in `types.ts`:

```typescript
interface CustomerDirectoryEntry {
  id: string;           // subscription id
  name: string;
  phone: string;
  email: string | null;
  planName: string;     // from meal_plans join
  subStatus: SubStatus; // active | paused | cancelled
  totalOrders: number;  // non-cancelled daily orders
  deliveredOrders: number;
  lastActiveDate: string | null;  // most recent delivery_date with an order
  joinedAt: string;     // subscription created_at
}
```

### 3.2 Service Method

`supabaseService.getCustomerDirectory(restaurantId?)`

```
1. Parallel query:
   a. customer_subscriptions JOIN meal_plans(name) — for all subscribers
   b. subscription_daily_orders (non-cancelled) — for stats

2. Aggregate in JS:
   Map<subscription_id, { total, delivered, lastDate }>
   (avoids a complex GROUP BY that would require a DB view)

3. Map to CustomerDirectoryEntry[]
```

Called in `refreshData()` alongside other subscription data.

### 3.3 UI

Replaces the "CRM MODULE v1.1 PENDING UPDATE" placeholder in `OwnerDashboard.tsx`.

**Table columns:**

| Column | Content |
|---|---|
| Name | `customer_name` + email in grey below |
| Mobile | `phone` in monospace |
| Subscription | Plan name + `active`/`paused`/`cancelled` badge |
| Orders | Total non-cancelled order count |
| Delivered | Count + mini green progress bar (fulfilled rate) |
| Last Active | Most recent delivery date (or —) |
| Joined | `created_at` formatted as locale date |

**Search:** Client-side filter on name or phone; resets to page 0 on change.

**Pagination:** 20 rows/page. Controls: prev/next chevrons + numbered buttons (up to 7 visible, windowed around current page). Uses an IIFE (`(() => { ... })()`) so all pagination logic is co-located with the render, avoiding extra state props.

---

## 4. Analytics Report Generation

### 4.1 Decision: Internal Data vs GA4

**Google Analytics 4 is not used and is not needed.**

| Metric | GA4 | Internal (Supabase) |
|---|---|---|
| Page views | ✓ (generic) | ✓ `watch_sessions` per-dish |
| Watch time per dish | ✗ | ✓ `watch_sessions.duration` |
| Reel completion rate | ✗ | ✓ `watch_sessions.completed` |
| Revenue per dish | ✗ | ✓ `orders.items` JSONB parsed |
| Subscription health | ✗ | ✓ `customer_subscriptions` |
| Delivery success rate | ✗ | ✓ `subscription_daily_orders` |
| Churn signals | ✗ | ✓ status = paused/cancelled |
| GDPR overhead | ✓ (cookies, consent) | ✗ (no external trackers) |

**Customer input data does not need to change.** Phone number + order history is sufficient. The analytics pipeline reads from tables that are already being written to by the existing order and watch-session flows.

### 4.2 Data Model

New interface in `types.ts`:

```typescript
interface AnalyticsReport {
  period: '24h' | '7d' | '30d';
  generatedAt: string;
  currency: string;

  revenue: {
    total: number;
    avgOrderValue: number;
    orderCount: number;
    topDishRevenue: Array<{ name: string; revenue: number; units: number }>;
  };

  engagement: {
    totalViews: number;
    engagementRate: number;      // % views > 5s
    avgWatchDuration: number;    // seconds
    completionRate: number;      // % completed reels
    topDishes: Array<{ name: string; views: number; conversionRate: number }>;
    lowConversionDishes: Array<{ name: string; views: number; conversionRate: number }>;
  };

  subscriptions: {
    active: number;
    paused: number;
    cancelled: number;
    totalOrders: number;
    deliveredOrders: number;
    deliveryRate: number;        // %
    planBreakdown: Array<{ planName: string; count: number; monthlyRevenue: number }>;
  };

  customers: {
    total: number;
    newThisPeriod: number;
  };
}
```

### 4.3 Service Method (`buildAnalyticsReport`)

`supabaseService.buildAnalyticsReport(timeWindow: '24h'|'7d'|'30d')`

Executes **7 parallel queries** then aggregates entirely in TypeScript:

```
Queries (all filtered by restaurant_id):
  1. watch_sessions  — dish_id, duration, completed (since window start)
  2. orders          — items (JSONB), total_amount  (since window start)
  3. dishes          — id, name (for name lookup)
  4. customer_subscriptions — id, status, plan_id, created_at (ALL time)
  5. subscription_daily_orders — status (ALL delivered records)
  6. meal_plans      — id, name, price_monthly
  7. restaurants     — currency

Aggregation:
  Revenue:
    - Sum total_amount from orders
    - Parse orders[].items (JSONB) → Map<dishId, {revenue, units}>
    - Sort top 5 by revenue

  Engagement:
    - Build dishViewMap: Map<dish_id, {views, completions}>
    - Build dishOrderMap: Map<dish_id, order_quantity> from JSONB
    - topDishes = sorted by view count (top 3)
    - lowConversionDishes = filter views >= 3, sort by conversionRate asc, top 3

  Subscriptions:
    - Count by status
    - Count delivered/total from subscription_daily_orders
    - planBreakdown: for each plan → count active subs × price_monthly

  Customers:
    - total = allSubs.length
    - newThisPeriod = subs where created_at >= since
```

### 4.4 AI Layer (`geminiService`)

`generateAnalyticsReport(report: AnalyticsReport, restaurantName: string): Promise<string>`

**With API key (Anthropic):**

- Posts `AnalyticsReport` JSON to `claude-sonnet-4-5` with `max_tokens: 1024`
- Prompt enforces exactly five `##`-prefixed sections:
  - `## Executive Summary`
  - `## Revenue & Orders`
  - `## Menu Performance`
  - `## Subscription Health`
  - `## Recommendations` (always 3 numbered actions referencing specific metrics)

**Without API key (fallback — deterministic):**

`buildFallbackReport(report)` constructs the same five-section structure from the data locally, with no LLM call. The owner always gets a useful, numbers-backed report regardless of whether the API key is set.

Old function `getAiInsights(dishPerformance, trafficHistory)` removed; all call sites updated.

### 4.5 UI Changes

**Data snapshot pills** — appear in the Analysis Engine card after a report is generated:

```
[Revenue: ₹0.00]  [Orders: 0]  [Views: 0]  [Engagement: 0.0%]
[Active Subs: 0]  [Delivery Rate: 0.0%]  [New Customers: 0]
```

**Sectioned report render** — splits on `## ` and renders each section as a borderd card with:
- Section title in `text-[10px] font-bold uppercase tracking-widest`
- Body text `text-sm leading-relaxed whitespace-pre-line`
- Left border accent with `border-zinc-700`

Previously the insights were rendered as a single `whitespace-pre-line` block with no structure.

**New state:**

```typescript
const [analyticsReport, setAnalyticsReport] = useState<AnalyticsReport | null>(null);
```

---

## 5. Files Changed

| File | Type | Summary |
|---|---|---|
| `types.ts` | Modified | Added: `TimeSlot`, `SubDeliveryType`, `SubStatus`, `DailyOrderStatus`, `TicketReason`, `TicketStatus`, `RefundStatus`, `TIME_SLOT_LABELS`, `TICKET_REASON_LABELS`, `MealPlan`, `CustomerSubscription`, `DailyOrder`, `DeliveryTicket`, `DeliveryAdjustment`, `RefundRequest`, `CustomerDirectoryEntry`, `AnalyticsReport` |
| `supabase/schema.sql` | Modified | Added tables 11–16 + RPCs 17–18 (see §2.2) |
| `lib/database.types.ts` | Modified | Added Row/Insert/Update types for all 6 new tables + RPC function signatures |
| `lib/supabase-admin.ts` | **New** | Server-side Supabase client using `SUPABASE_SERVICE_ROLE_KEY`; used only in `api/` routes |
| `services/supabaseService.ts` | Modified | Added `getCustomerDirectory`, `buildAnalyticsReport`, `getMealPlans`, `saveMealPlan`, `deleteMealPlan`, `getCustomerSubscriptions`, `getTomorrowsOrders`, `cancelDailyOrder`, `getDeliveryTickets`, `resolveDeliveryTicket`, `getRefundRequests`, `updateRefundStatus`, `getCustomerSubscription`, `createCustomerSubscription`, `selectDailyDish`, `pauseSubscription`, `resumeSubscription`, `cancelCustomerSubscription`, `getCustomerDailyOrders`, `raiseDeliveryTicket` |
| `services/geminiService.ts` | Modified | Replaced `getAiInsights` with `generateAnalyticsReport` + deterministic `buildFallbackReport`; `generateMarketingCopy` unchanged |
| `api/subscription/daily-digest.ts` | **New** | Vercel serverless function — daily email cron |
| `api/subscription/auto-deliver.ts` | **New** | Vercel serverless function — auto-mark delivered cron |
| `api/subscription/cancel-order.ts` | **New** | Vercel serverless function — owner cancellation email sender |
| `vercel.json` | Modified | Added 4 cron entries |
| `.env.example` | Modified | Added `SUPABASE_SERVICE_ROLE_KEY` |
| `pages/OwnerDashboard.tsx` | Modified | Added SUBSCRIPTIONS view (5 sub-tabs), CUSTOMERS table (search + pagination), analytics data pills + sectioned report render, new icons (`Search`, `ChevronLeft`, `ChevronRight`), new types imported |
| `pages/CustomerApp.tsx` | Modified | Added Bookmark button, full Subscription Panel (phone lookup → plans → subscribe form → manage view) |

---

## 6. Environment Variables

All new variables are server-side only (never exposed to the browser):

```env
# Server-side only — Vercel API routes
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
# Already present
ANTHROPIC_API_KEY=<your-key>
RESEND_API_KEY=<your-key>
FROM_EMAIL=noreply@yourdomain.com
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. It must **never** be set as a `VITE_` prefixed variable or used in any browser-executed code. It is only imported in `lib/supabase-admin.ts` which is only imported in `api/` route files.

---

## 7. Deployment Notes

### Supabase

Run `supabase/schema.sql` in order — the new tables (11–18) depend on `restaurants` and `dishes` existing. All additions use `CREATE TABLE IF NOT EXISTS` and `CREATE TYPE IF NOT EXISTS` so they are safe to re-run, but Postgres does not support `CREATE TYPE IF NOT EXISTS` in all versions — check your Supabase instance version if you encounter type-already-exists errors.

### Vercel

- Crons require **Vercel Pro** plan
- Add `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (non-VITE) to Vercel environment variables under Production only
- `SUPABASE_URL` fallback: the admin client accepts both `VITE_SUPABASE_URL` and `SUPABASE_URL` — set both for safety

### Local Development

```bash
# .env
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
RESEND_API_KEY=your-resend-key
FROM_EMAIL=test@yourdomain.com

pnpm dev
```

Vercel cron functions can be tested locally with:
```bash
curl "http://localhost:3000/api/subscription/daily-digest"
curl "http://localhost:3000/api/subscription/auto-deliver?slot=08-09"
```
