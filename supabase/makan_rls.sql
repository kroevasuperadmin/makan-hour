-- Least-privilege access for the Makan Hour demo. Only touches public.makan_* tables.
-- anon can: read the four tables; update the one session row and the three drop rows;
-- create/change/delete only the demo user's ("me") order and profile. No inserts of new
-- sessions or drops, no deletes outside "me", no TRUNCATE/REFERENCES/TRIGGER.
revoke all on public.makan_session, public.makan_orders, public.makan_drops, public.makan_profiles from anon, authenticated;
grant select, update on public.makan_session to anon;
grant select, update on public.makan_drops to anon;
grant select, insert, update, delete on public.makan_orders to anon;
grant select, insert, update, delete on public.makan_profiles to anon;

do $$ declare t text; begin
  foreach t in array array['makan_session','makan_orders','makan_drops','makan_profiles'] loop
    execute format('drop policy if exists makan_demo_anon on public.%I', t);
  end loop; end $$;

create policy makan_session_read on public.makan_session for select to anon using (id = 'demo');
create policy makan_session_write on public.makan_session for update to anon using (id = 'demo') with check (id = 'demo');

create policy makan_drops_read on public.makan_drops for select to anon using (session_id = 'demo');
create policy makan_drops_write on public.makan_drops for update to anon using (session_id = 'demo') with check (session_id = 'demo' and office_id in ('o1','o2','o3'));

create policy makan_orders_read on public.makan_orders for select to anon using (session_id = 'demo');
create policy makan_orders_ins on public.makan_orders for insert to anon with check (session_id = 'demo' and id = 'ord-me' and employee_id = 'me' and office_id = 'o1' and dish_id in ('d1','d2','d3','d4'));
create policy makan_orders_upd on public.makan_orders for update to anon using (session_id = 'demo' and employee_id = 'me') with check (session_id = 'demo' and id = 'ord-me' and employee_id = 'me' and office_id = 'o1' and dish_id in ('d1','d2','d3','d4'));
create policy makan_orders_del on public.makan_orders for delete to anon using (session_id = 'demo' and employee_id = 'me');

create policy makan_profiles_read on public.makan_profiles for select to anon using (session_id = 'demo');
create policy makan_profiles_ins on public.makan_profiles for insert to anon with check (session_id = 'demo' and employee_id = 'me' and length(floor) <= 40 and length(desk) <= 40);
create policy makan_profiles_upd on public.makan_profiles for update to anon using (session_id = 'demo' and employee_id = 'me') with check (session_id = 'demo' and employee_id = 'me' and length(floor) <= 40 and length(desk) <= 40);
create policy makan_profiles_del on public.makan_profiles for delete to anon using (session_id = 'demo' and employee_id = 'me');

-- Value sanity so a hand-crafted request can't write junk into the demo.
alter table public.makan_drops drop constraint if exists makan_drops_sane;
alter table public.makan_drops add constraint makan_drops_sane check (stage between 0 and 4 and delay_min between 0 and 240 and length(rider) <= 60);
alter table public.makan_session drop constraint if exists makan_session_sane;
alter table public.makan_session add constraint makan_session_sane check (cardinality(nudged) <= 200 and invoice_status in ('unpaid','paid') and coalesce(length(invoice_paid_ref),0) <= 60 and coalesce(length(invoice_paid_via),0) <= 120);

-- Ensure the rows the demo updates exist (service role / SQL editor only).
insert into public.makan_session (id, clock_base) values ('demo', 33480) on conflict (id) do nothing;
insert into public.makan_drops (session_id, office_id, caterer_id, stage, due_at, rider) values
  ('demo','o1','c1',0,44100,'Rider 07 · Faiz'), ('demo','o2','c1',0,44700,'Rider 03 · Hong'), ('demo','o3','c1',0,45300,'Rider 07 · Faiz')
  on conflict do nothing;
notify pgrst, 'reload schema';
