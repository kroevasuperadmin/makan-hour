-- Makan Hour: top-up sync + push tokens. Run once in the rizqey-admin SQL editor (needs the
-- service role / dashboard; the anon key the app uses cannot change schema). Only touches makan_*.

-- 1. Top-up switch and paid ref on the demo session row (anon already has UPDATE on this row).
alter table public.makan_session add column if not exists topups_allowed boolean not null default true;
alter table public.makan_session add column if not exists topup_paid_ref text;
alter table public.makan_session drop constraint if exists makan_session_topup_sane;
alter table public.makan_session add constraint makan_session_topup_sane check (coalesce(length(topup_paid_ref),0) <= 60);

-- 2. Allow the new over-allowance dish d5 (Nasi Kandar, RM 17.90) in the demo user's order.
drop policy if exists makan_orders_ins on public.makan_orders;
drop policy if exists makan_orders_upd on public.makan_orders;
create policy makan_orders_ins on public.makan_orders for insert to anon with check (session_id = 'demo' and id = 'ord-me' and employee_id = 'me' and office_id = 'o1' and dish_id in ('d1','d2','d3','d4','d5'));
create policy makan_orders_upd on public.makan_orders for update to anon using (session_id = 'demo' and employee_id = 'me') with check (session_id = 'demo' and id = 'ord-me' and employee_id = 'me' and office_id = 'o1' and dish_id in ('d1','d2','d3','d4','d5'));

-- 3. Device push tokens. No anon access at all: only the server routes (service role) read/write it.
create table if not exists public.makan_push_tokens (
  token text primary key, platform text not null check (platform in ('ios','android')),
  role text not null check (role in ('employee','admin')), employee_id text not null, office_id text not null,
  updated_at timestamptz not null default now(),
  check (length(token) <= 300 and length(employee_id) <= 40 and length(office_id) <= 10));
alter table public.makan_push_tokens enable row level security;
revoke all on public.makan_push_tokens from anon, authenticated;
-- Server-side de-dupe: last delay we pushed per drop.
alter table public.makan_drops add column if not exists delay_pushed_at int;
