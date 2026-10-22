-- Makan Hour migration 5: marketplace tables (customer, vendor, rider, platform admin).
-- Additive only. Does not alter makan_members, makan_orders, makan_session, or any payment table.
-- Access, seed rows, and payment columns are in makan_migration_6_marketplace_rls.sql.
-- Apply this file first. No anon or authenticated grants in this file.

create table if not exists public.makan_restaurants (
  id text primary key,
  name text not null,
  area text not null,
  cuisine text not null,
  halal boolean not null default true,
  eta_min int not null default 30,
  vendor_email text,
  active boolean not null default true
);

create table if not exists public.makan_menu_items (
  id text primary key,
  restaurant_id text not null references public.makan_restaurants(id),
  name text not null,
  description text not null default '',
  price_sen int not null check (price_sen >= 0),
  available boolean not null default true
);
create index if not exists makan_menu_items_restaurant on public.makan_menu_items(restaurant_id);

create table if not exists public.makan_market_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  email text not null,
  name text,
  role text not null check (role in ('customer', 'vendor', 'rider', 'admin')),
  restaurant_id text references public.makan_restaurants(id),
  created_at timestamptz not null default now(),
  unique (email, role)
);
create index if not exists makan_market_members_email on public.makan_market_members(email);

create table if not exists public.makan_consumer_orders (
  id text primary key,
  customer_member_id uuid references public.makan_market_members(id),
  restaurant_id text not null references public.makan_restaurants(id),
  status text not null check (status in ('placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')),
  address text not null,
  note text not null default '',
  placed_at timestamptz not null default now(),
  rider_member_id uuid references public.makan_market_members(id),
  total_sen int not null check (total_sen >= 0)
);
create index if not exists makan_consumer_orders_restaurant on public.makan_consumer_orders(restaurant_id, placed_at desc);
create index if not exists makan_consumer_orders_status on public.makan_consumer_orders(status);

create table if not exists public.makan_consumer_order_lines (
  id bigint generated always as identity primary key,
  order_id text not null references public.makan_consumer_orders(id) on delete cascade,
  item_id text not null,
  name text not null,
  qty int not null check (qty > 0),
  price_sen int not null check (price_sen >= 0)
);

alter table public.makan_restaurants enable row level security;
alter table public.makan_menu_items enable row level security;
alter table public.makan_market_members enable row level security;
alter table public.makan_consumer_orders enable row level security;
alter table public.makan_consumer_order_lines enable row level security;

revoke all on public.makan_restaurants from anon, authenticated;
revoke all on public.makan_menu_items from anon, authenticated;
revoke all on public.makan_market_members from anon, authenticated;
revoke all on public.makan_consumer_orders from anon, authenticated;
revoke all on public.makan_consumer_order_lines from anon, authenticated;

comment on table public.makan_restaurants is 'Marketplace restaurants. Payment columns are added in migration 6.';
