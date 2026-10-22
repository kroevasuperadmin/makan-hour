-- Marketplace roles on makan_members. Apply after supabase/makan_migration_5_marketplace.sql
-- and before supabase/makan_migration_6_marketplace_rls.sql.
-- Does not drop rows. Does not change office_id on rows that already have one.
-- Office employee and caterer rows still need an office. A marketplace admin may have none.
-- This file is not applied by the app. Leave MAKAN_MARKETPLACE_DB unset until it has run.

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'makan_members' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table public.makan_members drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.makan_members alter column office_id drop not null;

alter table public.makan_members drop constraint if exists makan_members_role_check;
alter table public.makan_members add constraint makan_members_role_check
  check (role in ('admin', 'employee', 'caterer', 'customer', 'vendor', 'rider'));

alter table public.makan_members drop constraint if exists makan_members_office_required;
alter table public.makan_members add constraint makan_members_office_required
  check (office_id is not null or role in ('customer', 'vendor', 'rider', 'admin'));

create unique index if not exists makan_members_market_email_role
  on public.makan_members (email, role)
  where office_id is null;

insert into public.makan_members (office_id, email, name, role)
select v.office_id, v.email, v.name, v.role
from (values
  (null::uuid, 'siti.market@contoh.my', 'Siti Aminah', 'customer'),
  (null::uuid, 'vendor.market@dapurcontoh.my', 'Dapur Contoh', 'vendor'),
  (null::uuid, 'faiz.market@contoh.my', 'Faiz Rahman', 'rider'),
  (null::uuid, 'farah.market@makanhour.example', 'Farah Lim', 'admin')
) as v(office_id, email, name, role)
where not exists (
  select 1 from public.makan_members m
  where m.office_id is null and m.email = v.email and m.role = v.role
);
