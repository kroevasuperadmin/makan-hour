create table if not exists public.makan_session (
  id text primary key, cutoff_passed boolean not null default false, batch_confirmed boolean not null default false,
  clock_base int not null, clock_started_at timestamptz not null default now(), nudged text[] not null default '{}',
  invoice_status text not null default 'unpaid', invoice_paid_ref text, invoice_paid_via text, updated_at timestamptz default now());
create table if not exists public.makan_orders (
  id text primary key, session_id text not null default 'demo', employee_id text not null, office_id text not null, dish_id text not null, placed_at int not null);
create table if not exists public.makan_drops (
  session_id text not null default 'demo', office_id text not null, caterer_id text not null, stage int not null default 0, due_at int not null,
  delay_min int not null default 0, delay_notified_at int, delivered_at int, rider text not null, primary key (session_id, office_id));
create table if not exists public.makan_profiles (
  session_id text not null default 'demo', employee_id text not null, floor text not null, desk text not null, primary key (session_id, employee_id));
do $$ declare t text; begin
  foreach t in array array['makan_session','makan_orders','makan_drops','makan_profiles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists makan_demo_anon on public.%I', t);
    execute format('create policy makan_demo_anon on public.%I for all to anon using (true) with check (true)', t);
    execute format('alter table public.%I replica identity full', t);
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop; end $$;
comment on table public.makan_session is 'Makan Hour investor demo (not Dossair). Safe to drop.';
