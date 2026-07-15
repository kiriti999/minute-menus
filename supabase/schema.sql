-- ============================================================
-- Minute Menus — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Enable pg_net for HTTP calls from functions (notify_sold_out)
create extension if not exists "pg_net";

-- ─────────────────────────────────────────────
-- IDEMPOTENCY: drop all existing policies so this script is re-runnable
-- ─────────────────────────────────────────────
do $$
declare r record;
begin
  for r in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- 1. RESTAURANTS
-- One row per restaurant. Linked to auth.users via owner_id.
-- ─────────────────────────────────────────────
create table if not exists restaurants (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  slug       text not null unique,
  currency   text not null default 'USD',
  created_at timestamptz not null default now()
);

-- Migration: Add currency column if upgrading existing DB
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

alter table restaurants enable row level security;

create policy "Owner can manage their restaurant"
  on restaurants for all
  using (auth.uid() = owner_id);

-- Allow public read access for QR code customer flow
create policy "Public can read restaurants"
  on restaurants for select
  using (true);

-- ─────────────────────────────────────────────
-- 2. CATEGORIES
-- Menu sections (e.g. "Starters", "Mains").
-- ─────────────────────────────────────────────
create table if not exists categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  title         text not null,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);

alter table categories enable row level security;

create policy "Owner can manage their categories"
  on categories for all
  using (
    exists (
      select 1 from restaurants r
      where r.id = categories.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

create policy "Public can read categories"
  on categories for select
  using (true);

-- ─────────────────────────────────────────────
-- 3. DISHES
-- Individual menu items, each belonging to a category.
-- ─────────────────────────────────────────────
create table if not exists dishes (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references categories(id) on delete cascade,
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  name             text not null,
  description      text not null default '',
  price            numeric(10, 2) not null default 0,
  image_url        text not null default '',
  video_url        text not null default '',
  popularity_score int  not null default 0,
  prep_time        int  not null default 0,
  media_transform  jsonb,
  stock_quantity   int,           -- null = unlimited; set to track daily SKU
  manual_sold_out  boolean not null default false,  -- owner override
  ingredients      text not null default '',
  benefits         text not null default '',
  calories         int,
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now()
);

-- Migration: run this on existing databases
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS stock_quantity int;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS manual_sold_out boolean NOT NULL DEFAULT false;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS ingredients text NOT NULL DEFAULT '';
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS benefits text NOT NULL DEFAULT '';
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS calories int;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

alter table dishes enable row level security;

create policy "Owner can manage their dishes"
  on dishes for all
  using (
    exists (
      select 1 from restaurants r
      where r.id = dishes.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

create policy "Public can read dishes"
  on dishes for select
  using (true);

-- ─────────────────────────────────────────────
-- 4. ORDERS
-- Customer orders. status tracks kitchen flow.
-- payment_provider: 'razorpay' (India) | 'clover' (US/CA)
-- ─────────────────────────────────────────────
do $$ begin
  create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type payment_provider as enum ('razorpay', 'clover');
exception when duplicate_object then null; end $$;

create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references restaurants(id) on delete cascade,
  items               jsonb not null default '[]',
  subtotal_amount     numeric(10, 2),
  gst_amount          numeric(10, 2) not null default 0,
  total_amount        numeric(10, 2) not null default 0,
  status              order_status not null default 'pending',
  payment_provider    payment_provider,
  payment_id          text,
  time_to_order       numeric(10, 2) not null default 0,
  created_at          timestamptz not null default now()
);

-- Migration for existing deployments
alter table orders add column if not exists subtotal_amount numeric(10, 2);
alter table orders add column if not exists gst_amount numeric(10, 2) not null default 0;

alter table orders enable row level security;

create policy "Owner can read their orders"
  on orders for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = orders.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

-- Orders are recorded server-side only (after Razorpay signature verification),
-- via the admin client in api/order/confirm-order.ts — no anon insert policy.

-- ─────────────────────────────────────────────
-- 5. WATCH SESSIONS
-- Per-dish engagement tracking. Written by anon customers.
-- ─────────────────────────────────────────────
create table if not exists watch_sessions (
  id            uuid primary key default gen_random_uuid(),
  dish_id       uuid not null references dishes(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  duration      numeric(10, 2) not null default 0,
  completed     boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table watch_sessions enable row level security;

create policy "Owner can read their watch sessions"
  on watch_sessions for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = watch_sessions.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

create policy "Anyone can record a watch session"
  on watch_sessions for insert
  with check (true);

-- ─────────────────────────────────────────────
-- 6. SUBSCRIPTIONS
-- Tracks each restaurant's Plus tier status.
-- ─────────────────────────────────────────────
do $$ begin
  create type subscription_tier as enum ('free', 'plus');
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null references restaurants(id) on delete cascade unique,
  tier                     subscription_tier not null default 'free',
  provider                 payment_provider,
  provider_subscription_id text,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now()
);

alter table subscriptions enable row level security;

-- Owners can read their own tier, but cannot write it directly — tier upgrades
-- happen server-side (api/subscription/confirm-plus-payment.ts) only after a
-- verified Razorpay payment. The one exception is the initial free-tier row
-- created alongside a new restaurant (see restaurantContext.ts ensureRestaurant).
create policy "Owner can read their subscription"
  on subscriptions for select
  using (
    exists (
      select 1 from restaurants r
      where r.id = subscriptions.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

create policy "Owner can insert their initial free subscription"
  on subscriptions for insert
  with check (
    tier = 'free'
    and exists (
      select 1 from restaurants r
      where r.id = subscriptions.restaurant_id
        and r.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 7. DISH STOCK (daily sold counts — publicly readable)
-- Tracks how many units of each dish have been sold today.
-- Public-readable so anonymous customers can see sold-out state.
-- Updated by recordOrder via upsert.
-- ─────────────────────────────────────────────
create table if not exists dish_stock_daily (
  dish_id       uuid not null references dishes(id) on delete cascade,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  sold_date     date not null default current_date,
  quantity_sold int  not null default 0,
  primary key (dish_id, sold_date)
);

alter table dish_stock_daily enable row level security;

-- Anyone (including anon customers) can read sold counts — no PII exposed
create policy "Public can read daily stock"
  on dish_stock_daily for select
  using (true);

-- Anyone can upsert sold counts (inserted alongside new orders)
create policy "Anyone can update daily stock"
  on dish_stock_daily for insert
  with check (true);

create policy "Anyone can increment daily stock"
  on dish_stock_daily for update
  using (true);

-- Migration: run this on existing databases
-- (copy the full block above and execute in the Supabase SQL Editor)

-- ─────────────────────────────────────────────
-- 9. RPC: increment_dish_stock
-- Atomically upserts the daily sold count for a dish.
-- Called from the client on every order confirmation.
-- Security: SECURITY DEFINER so anon users can call it.
-- ─────────────────────────────────────────────
create or replace function increment_dish_stock(
  p_dish_id       uuid,
  p_restaurant_id uuid,
  p_sold_date     date,
  p_quantity      int
) returns void
language plpgsql
security definer
as $$
begin
  insert into dish_stock_daily (dish_id, restaurant_id, sold_date, quantity_sold)
  values (p_dish_id, p_restaurant_id, p_sold_date, p_quantity)
  on conflict (dish_id, sold_date)
  do update set quantity_sold = dish_stock_daily.quantity_sold + excluded.quantity_sold;
end;
$$;

-- Grant anon and authenticated roles execution rights
grant execute on function increment_dish_stock to anon, authenticated;

-- ─────────────────────────────────────────────
-- 10. RPC: notify_sold_out
-- Calls the `sold-out-email` Edge Function to send
-- an email to the restaurant owner. Runs as SECURITY
-- DEFINER so it can read the owner's email from auth.users.
-- Invoked client-side when:
--   a) stock-based sold-out is detected after an order
--   b) owner manually marks a dish as sold-out
-- ─────────────────────────────────────────────
create or replace function notify_sold_out(
  p_dish_id       uuid,
  p_dish_name     text,
  p_restaurant_id uuid,
  p_reason        text   -- 'stock' or 'manual'
) returns void
language plpgsql
security definer
as $$
declare
  v_owner_email  text;
  v_restaurant   text;
  v_edge_url     text;
begin
  -- Resolve owner email from auth.users via restaurants table
  select u.email, r.name
    into v_owner_email, v_restaurant
    from restaurants r
    join auth.users u on u.id = r.owner_id
   where r.id = p_restaurant_id;

  if v_owner_email is null then return; end if;

  -- Build edge function URL from current Supabase project URL
  v_edge_url := current_setting('app.supabase_url', true) || '/functions/v1/sold-out-email';

  -- Fire-and-forget HTTP call to edge function
  perform net.http_post(
    url     := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := jsonb_build_object(
      'to',             v_owner_email,
      'restaurantName', v_restaurant,
      'dishName',       p_dish_name,
      'reason',         p_reason
    )
  );
end;
$$;

grant execute on function notify_sold_out to anon, authenticated;

-- ─────────────────────────────────────────────
-- 11. MEAL PLANS
-- Restaurant-defined subscription bundles for customers.
-- ─────────────────────────────────────────────
create table if not exists meal_plans (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  name           text not null,
  description    text not null default '',
  price_monthly  numeric(10, 2) not null default 0,
  delivery_fee   numeric(10, 2) not null default 0, -- 0 = free delivery
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

alter table meal_plans enable row level security;

create policy "Owner can manage meal plans"
  on meal_plans for all
  using (exists (select 1 from restaurants r where r.id = meal_plans.restaurant_id and r.owner_id = auth.uid()));

create policy "Public can read active meal plans"
  on meal_plans for select
  using (is_active = true);

-- Dishes available under each meal plan
create table if not exists meal_plan_dishes (
  plan_id  uuid not null references meal_plans(id) on delete cascade,
  dish_id  uuid not null references dishes(id) on delete cascade,
  primary key (plan_id, dish_id)
);

alter table meal_plan_dishes enable row level security;

create policy "Owner can manage meal plan dishes"
  on meal_plan_dishes for all
  using (
    exists (
      select 1 from meal_plans mp
      join restaurants r on r.id = mp.restaurant_id
      where mp.id = meal_plan_dishes.plan_id and r.owner_id = auth.uid()
    )
  );

create policy "Public can read meal plan dishes"
  on meal_plan_dishes for select
  using (true);

-- ─────────────────────────────────────────────
-- 12. CUSTOMER SUBSCRIPTIONS
-- One active subscription per phone number per restaurant.
-- ─────────────────────────────────────────────
do $$ begin
  create type sub_delivery_type as enum ('delivery', 'pickup');
exception when duplicate_object then null; end $$;
do $$ begin
  create type delivery_fee_mode as enum ('upfront', 'cash_on_delivery');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sub_time_slot as enum ('08-09', '12-14', '19-21');
exception when duplicate_object then null; end $$;
do $$ begin
  create type sub_status as enum ('active', 'paused', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists customer_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  plan_id          uuid not null references meal_plans(id),
  customer_name    text not null,
  phone            text not null,
  email            text,
  delivery_type    sub_delivery_type not null,
  delivery_fee_mode delivery_fee_mode not null default 'cash_on_delivery',
  time_slot        sub_time_slot not null,
  status           sub_status not null default 'active',
  pause_until      date,
  paused_days_used int not null default 0,  -- cumulative days paused this cycle
  start_date       date not null default current_date,
  end_date         date not null,           -- set to start_date + 30 on insert
  rotation_dish_ids uuid[] not null default '{}',  -- ordered dish IDs for round-robin delivery
  payment_provider payment_provider,
  payment_id       text,
  subtotal_amount  numeric(10, 2),
  gst_amount       numeric(10, 2) not null default 0,
  created_at       timestamptz not null default now(),
  unique (restaurant_id, phone)
);

alter table customer_subscriptions add column if not exists subtotal_amount numeric(10, 2);
alter table customer_subscriptions add column if not exists gst_amount numeric(10, 2) not null default 0;

alter table customer_subscriptions enable row level security;

create policy "Owner can manage customer subscriptions"
  on customer_subscriptions for all
  using (exists (select 1 from restaurants r where r.id = customer_subscriptions.restaurant_id and r.owner_id = auth.uid()));

-- Subscriptions are created server-side only (after Razorpay signature verification),
-- via the admin client in api/subscription/confirm-subscription.ts — no anon insert policy.

create policy "Public can read subscriptions"
  on customer_subscriptions for select
  using (true);

-- ─────────────────────────────────────────────
-- 13. DAILY SUBSCRIPTION ORDERS
-- Customer selects one dish per delivery day (before 5pm IST cutoff).
-- ─────────────────────────────────────────────
do $$ begin
  create type daily_order_status_t as enum ('pending', 'delivered', 'cancelled', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists subscription_daily_orders (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references customer_subscriptions(id) on delete cascade,
  restaurant_id       uuid not null references restaurants(id) on delete cascade,
  delivery_date       date not null,
  dish_id             uuid references dishes(id) on delete set null,
  dish_name           text not null default '',  -- snapshot at selection time
  status              daily_order_status_t not null default 'pending',
  cancelled_by        text,                      -- 'restaurant' | 'customer' | 'system'
  cancellation_reason text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (subscription_id, delivery_date)
);

alter table subscription_daily_orders enable row level security;

create policy "Owner can manage daily orders"
  on subscription_daily_orders for all
  using (exists (select 1 from restaurants r where r.id = subscription_daily_orders.restaurant_id and r.owner_id = auth.uid()));

create policy "Public can insert daily orders"
  on subscription_daily_orders for insert
  with check (true);

create policy "Public can read daily orders"
  on subscription_daily_orders for select
  using (true);

create policy "Public can update daily orders"
  on subscription_daily_orders for update
  using (true);

-- ─────────────────────────────────────────────
-- 14. SUBSCRIPTION REFUND REQUESTS
-- Customer requests refund on cancellation.
-- Restaurant manually processes within 7 days.
-- ─────────────────────────────────────────────
do $$ begin
  create type refund_status_t as enum ('pending', 'approved', 'rejected', 'processed');
exception when duplicate_object then null; end $$;

create table if not exists subscription_refund_requests (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references customer_subscriptions(id) on delete cascade,
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  reason           text not null,
  amount           numeric(10, 2) not null default 0,
  status           refund_status_t not null default 'pending',
  restaurant_notes text,
  created_at       timestamptz not null default now(),
  processed_at     timestamptz
);

alter table subscription_refund_requests enable row level security;

create policy "Owner can manage refund requests"
  on subscription_refund_requests for all
  using (exists (select 1 from restaurants r where r.id = subscription_refund_requests.restaurant_id and r.owner_id = auth.uid()));

create policy "Public can insert refund requests"
  on subscription_refund_requests for insert
  with check (true);

create policy "Public can read refund requests"
  on subscription_refund_requests for select
  using (true);

-- ─────────────────────────────────────────────
-- 15. DELIVERY TICKETS
-- Customer raises a ticket when delivery is not received / incorrect.
-- ─────────────────────────────────────────────
do $$ begin
  create type ticket_reason_t as enum (
    'not_received', 'wrong_item', 'partial_delivery',
    'damaged', 'late_delivery', 'other'
  );
exception when duplicate_object then null; end $$;
do $$ begin
  create type ticket_status_t as enum ('open', 'investigating', 'resolved');
exception when duplicate_object then null; end $$;

create table if not exists delivery_tickets (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references customer_subscriptions(id) on delete cascade,
  daily_order_id   uuid not null references subscription_daily_orders(id) on delete cascade,
  restaurant_id    uuid not null references restaurants(id) on delete cascade,
  reason           ticket_reason_t not null,
  notes            text,
  status           ticket_status_t not null default 'open',
  created_at       timestamptz not null default now()
);

alter table delivery_tickets enable row level security;

create policy "Owner can manage delivery tickets"
  on delivery_tickets for all
  using (exists (select 1 from restaurants r where r.id = delivery_tickets.restaurant_id and r.owner_id = auth.uid()));

create policy "Public can insert delivery tickets"
  on delivery_tickets for insert
  with check (true);

create policy "Public can read delivery tickets"
  on delivery_tickets for select
  using (true);

-- ─────────────────────────────────────────────
-- 16. DELIVERY ADJUSTMENTS
-- Audit trail of restaurant corrections after ticket verification.
-- ─────────────────────────────────────────────
create table if not exists delivery_adjustments (
  id        uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references delivery_tickets(id) on delete cascade,
  notes     text not null,
  created_at timestamptz not null default now()
);

alter table delivery_adjustments enable row level security;

create policy "Owner can manage delivery adjustments"
  on delivery_adjustments for all
  using (
    exists (
      select 1 from delivery_tickets dt
      join restaurants r on r.id = dt.restaurant_id
      where dt.id = delivery_adjustments.ticket_id and r.owner_id = auth.uid()
    )
  );

create policy "Public can read delivery adjustments"
  on delivery_adjustments for select
  using (true);

-- ─────────────────────────────────────────────
-- 17. RPC: upsert_daily_selection
-- Phone-authenticated customer selects a dish for tomorrow (before 5pm IST cutoff).
-- 5pm IST = 11:30 UTC.
-- ─────────────────────────────────────────────
create or replace function upsert_daily_selection(
  p_phone         text,
  p_restaurant_id uuid,
  p_delivery_date date,
  p_dish_id       uuid
) returns uuid
language plpgsql
security definer
as $$
declare
  v_sub      customer_subscriptions;
  v_order_id uuid;
  v_dish_name text;
begin
  select * into v_sub
  from customer_subscriptions
  where phone = p_phone and restaurant_id = p_restaurant_id and status = 'active';

  if not found then
    raise exception 'No active subscription found for this phone number';
  end if;

  -- 5pm IST cutoff = 11:30 UTC for next-day orders
  if now() at time zone 'UTC' > (current_date::text || ' 11:30:00')::timestamptz
     and p_delivery_date = current_date + 1 then
    raise exception 'Modification cutoff has passed (5:00 PM IST)';
  end if;

  if not exists (
    select 1 from meal_plan_dishes mpd
    where mpd.plan_id = v_sub.plan_id and mpd.dish_id = p_dish_id
  ) then
    raise exception 'Selected dish is not in this subscription plan';
  end if;

  select name into v_dish_name from dishes where id = p_dish_id;

  insert into subscription_daily_orders
    (subscription_id, restaurant_id, delivery_date, dish_id, dish_name, status)
  values
    (v_sub.id, p_restaurant_id, p_delivery_date, p_dish_id, v_dish_name, 'pending')
  on conflict (subscription_id, delivery_date)
  do update set
    dish_id   = excluded.dish_id,
    dish_name = excluded.dish_name,
    status    = 'pending',
    updated_at = now()
  returning id into v_order_id;

  return v_order_id;
end;
$$;

grant execute on function upsert_daily_selection to anon, authenticated;

-- ─────────────────────────────────────────────
-- 18. RPC: update_subscription_status
-- Phone-authenticated pause / resume / cancel.
-- Pause is capped at 7 cumulative days per subscription cycle.
-- ─────────────────────────────────────────────
create or replace function update_subscription_status(
  p_phone         text,
  p_restaurant_id uuid,
  p_new_status    sub_status,
  p_pause_until   date   default null,
  p_cancel_reason text   default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_sub      customer_subscriptions;
  v_days     int;
begin
  select * into v_sub
  from customer_subscriptions
  where phone = p_phone and restaurant_id = p_restaurant_id;

  if not found then
    raise exception 'Subscription not found';
  end if;

  if v_sub.status = 'cancelled' then
    raise exception 'Subscription is already cancelled';
  end if;

  if p_new_status = 'paused' then
    if p_pause_until is null then
      raise exception 'pause_until date is required';
    end if;
    v_days := p_pause_until - current_date;
    if v_days < 1 then
      raise exception 'pause_until must be a future date';
    end if;
    if v_sub.paused_days_used + v_days > 7 then
      raise exception 'Maximum 7-day pause limit per cycle would be exceeded';
    end if;
    update customer_subscriptions
    set status           = 'paused',
        pause_until      = p_pause_until,
        paused_days_used = paused_days_used + v_days
    where id = v_sub.id;

  elsif p_new_status = 'active' then
    update customer_subscriptions
    set status = 'active', pause_until = null
    where id = v_sub.id;

  elsif p_new_status = 'cancelled' then
    update customer_subscriptions
    set status = 'cancelled'
    where id = v_sub.id;
    if p_cancel_reason is not null then
      insert into subscription_refund_requests
        (subscription_id, restaurant_id, reason, amount)
      select v_sub.id, v_sub.restaurant_id, p_cancel_reason, mp.price_monthly
      from meal_plans mp where mp.id = v_sub.plan_id;
    end if;
  end if;

  return v_sub.id;
end;
$$;

grant execute on function update_subscription_status to anon, authenticated;

-- NOTE: notify_sold_out requires the pg_net extension and the following
-- Supabase settings to be configured:
--   ALTER DATABASE postgres SET app.supabase_url = 'https://YOUR_PROJECT.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
-- If pg_net is unavailable, the function silently no-ops — emails are then
-- sent directly from the client using supabaseService.sendSoldOutEmail().

-- ─────────────────────────────────────────────
-- 8. USEFUL INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_categories_restaurant on categories(restaurant_id);
create index if not exists idx_dishes_restaurant     on dishes(restaurant_id);
create index if not exists idx_dishes_category       on dishes(category_id);
create index if not exists idx_orders_restaurant     on orders(restaurant_id);
create index if not exists idx_sessions_restaurant   on watch_sessions(restaurant_id);
create index if not exists idx_sessions_dish         on watch_sessions(dish_id);
create index if not exists idx_orders_created        on orders(created_at desc);
create index if not exists idx_sessions_created      on watch_sessions(created_at desc);


-- ─────────────────────────────────────────────
-- MIGRATION: add rotation_dish_ids to existing DBs
-- Run this once on any database created before this column was added:
-- ALTER TABLE customer_subscriptions
--   ADD COLUMN IF NOT EXISTS rotation_dish_ids uuid[] NOT NULL DEFAULT '{}';
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 17. CUSTOMER PROFILES
-- Stores authenticated customer info (auth via Supabase Auth).
-- One profile per auth user. Address used for delivery checkout.
-- ─────────────────────────────────────────────
create table if not exists customer_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique,  -- Supabase Auth user id
  email            text not null,
  email_verified   boolean not null default false,
  phone            text,
  name             text,
  -- Address fields
  address_line1    text,    -- apartment/building name, house number
  address_line2    text,    -- plot/flat number
  street           text,
  area             text,
  landmark         text,
  city             text,
  state            text,
  pincode          text,
  -- Google Maps location (optional)
  lat              decimal(10, 8),
  lng              decimal(11, 8),
  formatted_address text,   -- full address from Google Places
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table customer_profiles enable row level security;

-- Customers can read/update only their own profile
create policy "Users can view own profile"
  on customer_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on customer_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on customer_profiles for insert
  with check (auth.uid() = user_id);

-- Index for fast lookup by user_id
create index if not exists idx_customer_profiles_user on customer_profiles(user_id);

-- ─────────────────────────────────────────────
-- MIGRATION: run these on existing databases:
-- CREATE TABLE IF NOT EXISTS customer_profiles (...);  -- full definition above
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 18. STORAGE — dish-media (reel videos / photos)
-- Large uploads go to Storage; dishes table stores public URLs only.
-- Bucket is created via Storage API (pnpm storage:ensure / db:push); policies below.
-- ─────────────────────────────────────────────
drop policy if exists "Public read dish media" on storage.objects;
drop policy if exists "Owner upload dish media" on storage.objects;
drop policy if exists "Owner update dish media" on storage.objects;
drop policy if exists "Owner delete dish media" on storage.objects;
drop policy if exists "Owner manage dish media" on storage.objects;

create or replace function public.is_dish_media_owner(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.owner_id = auth.uid()
      and split_part(object_name, '/', 1) = r.id::text
  );
$$;

grant execute on function public.is_dish_media_owner(text) to authenticated, anon;

create policy "Public read dish media"
  on storage.objects for select
  using (bucket_id = 'dish-media');

create policy "Owner manage dish media"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'dish-media'
    and public.is_dish_media_owner(name)
  )
  with check (
    bucket_id = 'dish-media'
    and public.is_dish_media_owner(name)
  );

-- ─────────────────────────────────────────────
-- 18B. STORAGE — invoices (PDF/image invoices for costing)
-- Private bucket; only owners can access their restaurant's invoices.
-- ─────────────────────────────────────────────
drop policy if exists "Owner read invoices" on storage.objects;
drop policy if exists "Owner manage invoices" on storage.objects;

create or replace function public.is_invoice_owner(object_name text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurants r
    where r.owner_id = auth.uid()
      and split_part(object_name, '/', 1) = r.id::text
  );
$$;

grant execute on function public.is_invoice_owner(text) to authenticated;

-- Owners can read their own restaurant's invoices
create policy "Owner read invoices"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'invoices'
    and public.is_invoice_owner(name)
  );

-- Owners can upload/delete their own restaurant's invoices
create policy "Owner manage invoices"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'invoices'
    and public.is_invoice_owner(name)
  )
  with check (
    bucket_id = 'invoices'
    and public.is_invoice_owner(name)
  );

-- ─────────────────────────────────────────────
-- MIGRATION: harden payment-related tables (existing databases)
-- Orders, customer subscriptions, and Plus tier upgrades now write via the
-- admin client only, after server-side Razorpay signature verification —
-- run this once to remove the old anon/owner self-service write policies:
--
-- ALTER TABLE customer_subscriptions
--   ADD COLUMN IF NOT EXISTS payment_provider payment_provider,
--   ADD COLUMN IF NOT EXISTS payment_id text;
--
-- DROP POLICY IF EXISTS "Anyone can place an order" ON orders;
-- DROP POLICY IF EXISTS "Public can insert subscriptions" ON customer_subscriptions;
-- DROP POLICY IF EXISTS "Owner can manage their subscription" ON subscriptions;
-- ─────────────────────────────────────────────
alter table customer_subscriptions
  add column if not exists payment_provider payment_provider,
  add column if not exists payment_id text;

drop policy if exists "Anyone can place an order" on orders;
drop policy if exists "Public can insert subscriptions" on customer_subscriptions;
drop policy if exists "Owner can manage their subscription" on subscriptions;

-- ─────────────────────────────────────────────
-- 18. MENU COSTING & PRICING (owner-only)
-- Ingredient invoices → ingredient library → per-dish recipes → cost per plate.
-- All amounts are in the restaurant's own currency. GST is not part of costing.
-- ─────────────────────────────────────────────

do $$ begin
  create type purchase_unit as enum ('kg', 'g', 'l', 'ml', 'piece');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ingredient_source as enum ('invoice', 'manual');
exception when duplicate_object then null; end $$;

-- Monthly fixed costs (one row per restaurant per month).
create table if not exists restaurant_overhead (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  month          date not null,            -- first day of the month
  rent           numeric(12, 2) not null default 0,
  wages          numeric(12, 2) not null default 0,
  electricity    numeric(12, 2) not null default 0,
  gas            numeric(12, 2) not null default 0,
  internet       numeric(12, 2) not null default 0,
  packing        numeric(12, 2) not null default 0,
  other          numeric(12, 2) not null default 0,
  expected_orders int,                      -- optional: for overhead-per-plate
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, month)
);

alter table restaurant_overhead enable row level security;

create policy "Owner can manage overhead"
  on restaurant_overhead for all
  using (exists (select 1 from restaurants r where r.id = restaurant_overhead.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = restaurant_overhead.restaurant_id and r.owner_id = auth.uid()));

-- Uploaded purchase invoices (PDF/image in Storage), parsed by AI into line items.
create table if not exists ingredient_invoices (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  month          date not null,            -- first day of the invoice's month
  file_url       text,
  file_name      text,
  total_amount   numeric(12, 2) not null default 0,
  line_items     jsonb not null default '[]',  -- [{name, quantity, unit, amount}]
  created_at     timestamptz not null default now()
);

alter table ingredient_invoices enable row level security;

create policy "Owner can manage invoices"
  on ingredient_invoices for all
  using (exists (select 1 from restaurants r where r.id = ingredient_invoices.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = ingredient_invoices.restaurant_id and r.owner_id = auth.uid()));

-- Ingredient library with derived unit cost (per base unit: gram/ml/piece).
create table if not exists ingredients (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  name              text not null,
  purchase_unit     purchase_unit not null default 'g',
  purchase_quantity numeric(12, 3) not null default 0,  -- in purchase_unit
  purchase_amount   numeric(12, 2) not null default 0,  -- currency paid for that quantity
  unit_cost         numeric(12, 6) not null default 0,  -- per base unit (gram/ml/piece)
  source            ingredient_source not null default 'manual',  -- 'invoice' or 'manual'
  source_invoice_id uuid references ingredient_invoices(id) on delete set null,
  updated_at        timestamptz not null default now(),
  unique (restaurant_id, name)
);

alter table ingredients enable row level security;

create policy "Owner can manage ingredients"
  on ingredients for all
  using (exists (select 1 from restaurants r where r.id = ingredients.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = ingredients.restaurant_id and r.owner_id = auth.uid()));

-- Per-dish recipe: how much of each ingredient goes into one plate.
create table if not exists dish_recipe_lines (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  dish_id        uuid not null references dishes(id) on delete cascade,
  ingredient_id  uuid not null references ingredients(id) on delete cascade,
  quantity       numeric(12, 3) not null default 0,  -- per plate, in ingredient base unit
  created_at     timestamptz not null default now(),
  unique (dish_id, ingredient_id)
);

alter table dish_recipe_lines enable row level security;

create policy "Owner can manage recipe lines"
  on dish_recipe_lines for all
  using (exists (select 1 from restaurants r where r.id = dish_recipe_lines.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = dish_recipe_lines.restaurant_id and r.owner_id = auth.uid()));

-- Cached cost per plate on the dish (optional; recomputed on demand).
alter table dishes add column if not exists cost_per_plate numeric(12, 2);

create index if not exists idx_overhead_restaurant   on restaurant_overhead(restaurant_id);
create index if not exists idx_invoices_restaurant   on ingredient_invoices(restaurant_id);
create index if not exists idx_ingredients_restaurant on ingredients(restaurant_id);
create index if not exists idx_recipe_dish           on dish_recipe_lines(dish_id);

-- ─────────────────────────────────────────────
-- 19. STAFF TIME TRACKING (QR badge clock in/out)
-- Reusable badge slots; owner reassigns staff without reprinting stickers.
-- ─────────────────────────────────────────────
create table if not exists staff_badges (
  id                 uuid primary key default gen_random_uuid(),
  restaurant_id      uuid not null references restaurants(id) on delete cascade,
  badge_token        text not null unique default encode(gen_random_bytes(24), 'hex'),
  label              text not null default 'Badge',
  assigned_staff_id  uuid,
  created_at         timestamptz not null default now()
);

create table if not exists restaurant_staff (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  name           text not null,
  phone          text,
  active         boolean not null default true,
  resigned_at    timestamptz,
  created_at     timestamptz not null default now()
);

alter table staff_badges
  add constraint staff_badges_assigned_staff_fk
  foreign key (assigned_staff_id) references restaurant_staff(id) on delete set null;

create table if not exists time_logs (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references restaurants(id) on delete cascade,
  staff_id       uuid not null references restaurant_staff(id) on delete cascade,
  badge_id       uuid references staff_badges(id) on delete set null,
  clock_in_at    timestamptz not null default now(),
  clock_out_at   timestamptz,
  source         text not null default 'qr_scan',
  created_at     timestamptz not null default now()
);

alter table staff_badges enable row level security;
alter table restaurant_staff enable row level security;
alter table time_logs enable row level security;

create policy "Owner can manage staff badges"
  on staff_badges for all
  using (exists (select 1 from restaurants r where r.id = staff_badges.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = staff_badges.restaurant_id and r.owner_id = auth.uid()));

create policy "Owner can manage restaurant staff"
  on restaurant_staff for all
  using (exists (select 1 from restaurants r where r.id = restaurant_staff.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = restaurant_staff.restaurant_id and r.owner_id = auth.uid()));

create policy "Owner can read time logs"
  on time_logs for select
  using (exists (select 1 from restaurants r where r.id = time_logs.restaurant_id and r.owner_id = auth.uid()));

create index if not exists idx_staff_badges_restaurant on staff_badges(restaurant_id);
create index if not exists idx_restaurant_staff_restaurant on restaurant_staff(restaurant_id);
create index if not exists idx_time_logs_restaurant on time_logs(restaurant_id);
create index if not exists idx_time_logs_staff on time_logs(staff_id);
create index if not exists idx_time_logs_clock_in on time_logs(clock_in_at desc);

create or replace function get_staff_clock_status(p_badge_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge staff_badges%rowtype;
  v_staff restaurant_staff%rowtype;
  v_open  time_logs%rowtype;
begin
  select * into v_badge from staff_badges where badge_token = p_badge_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid badge');
  end if;

  if v_badge.assigned_staff_id is null then
    return jsonb_build_object('ok', false, 'error', 'Badge not assigned', 'badge_label', v_badge.label);
  end if;

  select * into v_staff from restaurant_staff
  where id = v_badge.assigned_staff_id and active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No active staff on this badge', 'badge_label', v_badge.label);
  end if;

  select * into v_open from time_logs
  where staff_id = v_staff.id and clock_out_at is null
  order by clock_in_at desc limit 1;

  return jsonb_build_object(
    'ok', true,
    'staff_name', v_staff.name,
    'badge_label', v_badge.label,
    'is_clocked_in', v_open.id is not null,
    'last_event_at', coalesce(v_open.clock_in_at, null)
  );
end;
$$;

grant execute on function get_staff_clock_status to anon, authenticated;

-- RPC: toggle clock in/out on QR scan
create or replace function toggle_staff_clock(p_badge_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge staff_badges%rowtype;
  v_staff restaurant_staff%rowtype;
  v_open  time_logs%rowtype;
  v_now   timestamptz := now();
begin
  select * into v_badge from staff_badges where badge_token = p_badge_token;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid badge');
  end if;

  if v_badge.assigned_staff_id is null then
    return jsonb_build_object('ok', false, 'error', 'Badge not assigned');
  end if;

  select * into v_staff from restaurant_staff
  where id = v_badge.assigned_staff_id and active = true;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'No active staff on this badge');
  end if;

  select * into v_open from time_logs
  where staff_id = v_staff.id and clock_out_at is null
  order by clock_in_at desc limit 1;

  if v_open.id is not null then
    update time_logs set clock_out_at = v_now where id = v_open.id;
    return jsonb_build_object(
      'ok', true,
      'action', 'out',
      'staff_name', v_staff.name,
      'at', v_now
    );
  end if;

  insert into time_logs (restaurant_id, staff_id, badge_id, clock_in_at, source)
  values (v_badge.restaurant_id, v_staff.id, v_badge.id, v_now, 'qr_scan');

  return jsonb_build_object(
    'ok', true,
    'action', 'in',
    'staff_name', v_staff.name,
    'at', v_now
  );
end;
$$;

grant execute on function toggle_staff_clock to anon, authenticated;

-- ─────────────────────────────────────────────
-- 20. COUNTER SALES INVOICES (offline billing)
-- ─────────────────────────────────────────────
do $$ begin
  create type sales_payment_method as enum ('cash', 'paytm_card', 'razorpay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sales_payment_status as enum ('pending', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists sales_invoice_counters (
  restaurant_id  uuid primary key references restaurants(id) on delete cascade,
  last_num       int not null default 0
);

create table if not exists sales_invoices (
  id                      uuid primary key default gen_random_uuid(),
  restaurant_id           uuid not null references restaurants(id) on delete cascade,
  invoice_num             int not null,
  invoice_label           text not null,
  items                   jsonb not null default '[]',
  subtotal_amount         numeric(10, 2) not null default 0,
  gst_amount              numeric(10, 2) not null default 0,
  total_amount            numeric(10, 2) not null,
  payment_method          sales_payment_method,
  payment_status          sales_payment_status not null default 'pending',
  customer_phone          text,
  razorpay_order_id       text,
  razorpay_payment_id     text,
  razorpay_qr_id          text,
  razorpay_qr_image_url   text,
  razorpay_payment_link_id text,
  payment_link_url        text,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  unique (restaurant_id, invoice_num)
);

alter table sales_invoices enable row level security;

create policy "Owner can manage sales invoices"
  on sales_invoices for all
  using (exists (select 1 from restaurants r where r.id = sales_invoices.restaurant_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from restaurants r where r.id = sales_invoices.restaurant_id and r.owner_id = auth.uid()));

create index if not exists idx_sales_invoices_restaurant on sales_invoices(restaurant_id);
create index if not exists idx_sales_invoices_created on sales_invoices(created_at desc);
create index if not exists idx_sales_invoices_razorpay_order on sales_invoices(razorpay_order_id);

-- ─────────────────────────────────────────────
-- 21. OWNER SETTINGS (private AI keys per auth user)
-- ─────────────────────────────────────────────
create table if not exists owner_settings (
  owner_id           uuid primary key references auth.users(id) on delete cascade,
  anthropic_api_key  text,
  anthropic_model    text not null default 'claude-haiku-4-5',
  updated_at         timestamptz not null default now()
);

alter table owner_settings enable row level security;

create policy "Owner manages own settings"
  on owner_settings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create or replace function next_sales_invoice_label(p_restaurant_id uuid)
returns table(invoice_num int, invoice_label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num int;
  v_slug text;
begin
  insert into sales_invoice_counters (restaurant_id, last_num)
  values (p_restaurant_id, 1)
  on conflict (restaurant_id) do update
  set last_num = sales_invoice_counters.last_num + 1
  returning last_num into v_num;

  select slug into v_slug from restaurants where id = p_restaurant_id;
  invoice_num := v_num;
  invoice_label := upper(substr(coalesce(v_slug, 'inv'), 1, 8)) || '-' || lpad(v_num::text, 4, '0');
  return next;
end;
$$;

grant execute on function next_sales_invoice_label to authenticated;
