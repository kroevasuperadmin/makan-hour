-- Makan Hour migration 2. Run once in the rizqey-admin SQL editor. Idempotent, only touches makan_*.
-- Part A: top-up sync, d5 order rule, push tokens (was makan_topups_push.sql).
-- Part B: real sign-up. Offices, members with admin-assigned roles, invite claiming.
-- Before using Part B: Auth → Email templates → "Magic Link" must include {{ .Token }} so users get a 6-digit code.

-- ───────────── Part A ─────────────

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

-- ───────────── Part B ─────────────
create table if not exists public.makan_offices (
  id uuid primary key default gen_random_uuid(),
  company text not null check (length(btrim(company)) between 2 and 120),
  building text check (length(building) <= 160),
  district text check (length(district) <= 80),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now());

create table if not exists public.makan_members (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.makan_offices(id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and length(email) <= 254 and email like '_%@_%._%'),
  name text check (length(name) <= 80),
  role text not null check (role in ('admin', 'employee', 'caterer')),
  user_id uuid references auth.users(id) on delete set null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (office_id, email));
create index if not exists makan_members_user on public.makan_members(user_id);
create index if not exists makan_members_email on public.makan_members(email);

alter table public.makan_offices enable row level security;
alter table public.makan_members enable row level security;
revoke all on public.makan_offices, public.makan_members from anon, authenticated;
grant select on public.makan_offices to authenticated;
grant select, insert, delete on public.makan_members to authenticated;
grant update (role, name) on public.makan_members to authenticated;  -- nobody can rewrite email, office or user_id

-- Helpers run as definer so policies on makan_members don't recurse.
create or replace function public.makan_is_member(o uuid) returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from makan_members where office_id = o and user_id = auth.uid()) $$;
create or replace function public.makan_is_admin(o uuid) returns boolean language sql stable security definer set search_path = public as
  $$ select exists (select 1 from makan_members where office_id = o and user_id = auth.uid() and role = 'admin') $$;
revoke all on function public.makan_is_member(uuid), public.makan_is_admin(uuid) from public, anon;
grant execute on function public.makan_is_member(uuid), public.makan_is_admin(uuid) to authenticated;

drop policy if exists makan_offices_read on public.makan_offices;
create policy makan_offices_read on public.makan_offices for select to authenticated using (public.makan_is_member(id));
-- No insert policy on offices: they are created only through makan_create_office().

drop policy if exists makan_members_read on public.makan_members;
drop policy if exists makan_members_invite on public.makan_members;
drop policy if exists makan_members_update on public.makan_members;
drop policy if exists makan_members_remove on public.makan_members;
create policy makan_members_read on public.makan_members for select to authenticated using (public.makan_is_member(office_id));
-- Only an office admin adds people, and the row starts unclaimed. Users never insert themselves.
create policy makan_members_invite on public.makan_members for insert to authenticated
  with check (public.makan_is_admin(office_id) and invited_by = auth.uid() and user_id is null);
-- Admins change other people's role or name, never their own (so an office can't lose its last admin by accident).
create policy makan_members_update on public.makan_members for update to authenticated
  using (public.makan_is_admin(office_id) and user_id is distinct from auth.uid())
  with check (public.makan_is_admin(office_id));
create policy makan_members_remove on public.makan_members for delete to authenticated
  using (public.makan_is_admin(office_id) and user_id is distinct from auth.uid());

-- Sign-up: the signed-in user creates one office and becomes its admin. Max 3 offices per user.
create or replace function public.makan_create_office(p_company text, p_building text, p_district text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare o uuid; e text := lower(auth.email());
begin
  if auth.uid() is null or e is null then raise exception 'sign in first'; end if;
  if (select count(*) from makan_offices where created_by = auth.uid()) >= 3 then raise exception 'office limit reached'; end if;
  insert into makan_offices (company, building, district, created_by) values (btrim(p_company), nullif(btrim(p_building), ''), nullif(btrim(p_district), ''), auth.uid()) returning id into o;
  insert into makan_members (office_id, email, name, role, user_id, invited_by) values (o, e, nullif(btrim(p_name), ''), 'admin', auth.uid(), auth.uid());
  return o;
end $$;

-- Sign-in: attach any invites for this verified email to the user, then return their memberships.
create or replace function public.makan_claim_invites()
returns table (member_id uuid, office_id uuid, company text, building text, role text, name text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  update makan_members m set user_id = auth.uid() where m.email = lower(auth.email()) and m.user_id is null;
  return query select m.id, m.office_id, o.company, o.building, m.role, m.name
    from makan_members m join makan_offices o on o.id = m.office_id where m.user_id = auth.uid() order by m.created_at;
end $$;
revoke all on function public.makan_create_office(text, text, text, text), public.makan_claim_invites() from public, anon;
grant execute on function public.makan_create_office(text, text, text, text), public.makan_claim_invites() to authenticated;
comment on table public.makan_offices is 'Makan Hour offices (real sign-ups). Not Dossair.';
