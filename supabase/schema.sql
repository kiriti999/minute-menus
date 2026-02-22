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
  created_at timestamptz not null default now()
);

alter table restaurants enable row level security;

create policy "Owner can manage their restaurant"
  on restaurants for all
  using (auth.uid() = owner_id);

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
  created_at       timestamptz not null default now()
);

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
-- 7. USEFUL INDEXES
-- ─────────────────────────────────────────────
create index if not exists idx_categories_restaurant on categories(restaurant_id);
create index if not exists idx_dishes_restaurant     on dishes(restaurant_id);
create index if not exists idx_dishes_category       on dishes(category_id);
create index if not exists idx_orders_restaurant     on orders(restaurant_id);
create index if not exists idx_sessions_restaurant   on watch_sessions(restaurant_id);
create index if not exists idx_sessions_dish         on watch_sessions(dish_id);
create index if not exists idx_orders_created        on orders(created_at desc);
create index if not exists idx_sessions_created      on watch_sessions(created_at desc);
