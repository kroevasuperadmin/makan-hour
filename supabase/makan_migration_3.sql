-- Makan Hour migration 3: OAuth and password sign-in. Idempotent, only touches makan_*.
-- 1. Invites are claimed only by a verified email (OAuth providers verify it; password
--    accounts verify it by confirming their address once).
-- 2. Optional per-office admin domain: when set, an admin row is claimed only by an email
--    at that domain (e.g. contoh-capital.my).
alter table public.makan_offices add column if not exists admin_domain text;

create or replace function public.makan_claim_invites()
returns table (member_id uuid, office_id uuid, company text, building text, role text, name text)
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(auth.email());
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null) then
    update makan_members m set user_id = auth.uid()
      from makan_offices o
     where o.id = m.office_id and m.email = v_email and m.user_id is null
       and (m.role <> 'admin' or o.admin_domain is null or v_email like '%@' || lower(o.admin_domain));
  end if;
  return query select m.id, m.office_id, o.company, o.building, m.role, m.name
    from makan_members m join makan_offices o on o.id = m.office_id
   where m.user_id = auth.uid()
     and (m.role <> 'admin' or o.admin_domain is null or v_email like '%@' || lower(o.admin_domain))
   order by m.created_at;
end $$;

create or replace function public.makan_set_admin_domain(p_office uuid, p_domain text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from makan_members where office_id = p_office and user_id = auth.uid() and role = 'admin') then
    raise exception 'only an office admin can change this'; end if;
  update makan_offices set admin_domain = nullif(lower(trim(both '@ ' from coalesce(p_domain, ''))), '') where id = p_office;
end $$;
revoke all on function public.makan_claim_invites(), public.makan_set_admin_domain(uuid, text) from public, anon;
grant execute on function public.makan_claim_invites(), public.makan_set_admin_domain(uuid, text) to authenticated;
