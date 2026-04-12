-- ============================================================
-- Minute Menus — Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

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
  created_at       timestamptz not null default now()
);

-- Migration: run this on existing databases
-- ALTER TABLE dishes ADD COLUMN IF NOT EXISTS stock_quantity int;
-- ALTER TABLE dishes ADD COLUMN IF NOT EXISTS manual_sold_out boolean NOT NULL DEFAULT false;

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
create type order_status as enum ('pending', 'confirmed', 'preparing', 'ready', 'completed');
create type payment_provider as enum ('razorpay', 'clover');

create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  restaurant_id       uuid not null references restaurants(id) on delete cascade,
  items               jsonb not null default '[]',
  total_amount        numeric(10, 2) not null default 0,
  status              order_status not null default 'pending',
  payment_provider    payment_provider,
  payment_id          text,
  time_to_order       numeric(10, 2) not null default 0,
  created_at          timestamptz not null default now()
);

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

-- Anon users can insert orders (checkout)
create policy "Anyone can place an order"
  on orders for insert
  with check (true);

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
create type subscription_tier as enum ('free', 'plus');

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

create policy "Owner can manage their subscription"
  on subscriptions for all
  using (
    exists (
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
