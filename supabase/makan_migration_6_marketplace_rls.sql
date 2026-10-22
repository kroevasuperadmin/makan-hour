-- Makan Hour migration 6: marketplace access. Apply after makan_migration_5_marketplace.sql.
-- Additive. Touches only makan_restaurants, makan_menu_items, makan_market_members,
-- makan_consumer_orders, makan_consumer_order_lines, and new functions.
-- Does not drop or alter office-lunch tables (makan_session, makan_orders, makan_drops,
-- makan_profiles, makan_members, makan_offices, makan_push_tokens).

alter table public.makan_consumer_orders add column if not exists stripe_session_id text;
alter table public.makan_consumer_orders add column if not exists paid_ref text;
alter table public.makan_consumer_orders add column if not exists paid_via text;

do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'makan_consumer_orders' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.makan_consumer_orders drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.makan_consumer_orders add constraint makan_consumer_orders_status_check
  check (status in ('awaiting_payment', 'placed', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'));

create index if not exists makan_market_members_user on public.makan_market_members(user_id);

insert into public.makan_restaurants (id, name, area, cuisine, halal, eta_min, vendor_email) values
  ('r1', 'Dapur Contoh', 'Kampung Kerinchi', 'Malay', true, 30, 'vendor.market@dapurcontoh.my'),
  ('r2', 'Rasa Sampel', 'Brickfields', 'Mamak', true, 25, null),
  ('r3', 'Kedai Contoh', 'Bangsar South', 'Noodles', false, 20, null)
on conflict (id) do nothing;

insert into public.makan_menu_items (id, restaurant_id, name, description, price_sen, available) values
  ('i-ayam', 'r1', 'Nasi Ayam Hainan', 'Roasted chicken, stock rice, chilli-ginger sauce', 1390, true),
  ('i-lemak', 'r1', 'Nasi Lemak Ayam Berempah', 'Spiced chicken, sambal, egg, cucumber', 1450, true),
  ('i-kandar', 'r1', 'Nasi Kandar Ayam Madu', 'Honey chicken, mixed curry, papadom', 1790, true),
  ('i-mee', 'r2', 'Mee Goreng Mamak', 'Wok-fried noodles, tofu, lime', 1200, true),
  ('i-roti', 'r2', 'Roti Canai Telur', 'Two pieces, dhal and fish curry', 650, true),
  ('i-teh', 'r2', 'Teh Tarik', 'Pulled milk tea, less sweet', 350, true),
  ('i-wantan', 'r3', 'Wantan Mee', 'Egg noodles, char siu, greens', 1300, true),
  ('i-horfun', 'r3', 'Ipoh Hor Fun', 'Flat rice noodles, prawn, chicken', 1400, true),
  ('i-veg', 'r3', 'Vegetable Noodle Soup', 'Clear broth, greens, tofu', 1100, true)
on conflict (id) do nothing;

insert into public.makan_market_members (email, name, role, restaurant_id) values
  ('siti.market@contoh.my', 'Siti Aminah', 'customer', null),
  ('vendor.market@dapurcontoh.my', 'Dapur Contoh', 'vendor', 'r1'),
  ('faiz.market@contoh.my', 'Faiz Rahman', 'rider', null),
  ('farah.market@makanhour.example', 'Farah Lim', 'admin', null)
on conflict (email, role) do nothing;

-- Who is signed in. Security definer so callers don't need table grants.
-- Returns every marketplace role on this email. The app picks the door the person chose.
create or replace function public.makan_claim_market()
returns table (member_id uuid, role text, name text, restaurant_id text, restaurant_name text)
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null or v_email = '' then raise exception 'sign in first'; end if;
  update public.makan_market_members m
    set user_id = auth.uid()
    where m.email = v_email and (m.user_id is null or m.user_id = auth.uid());
  return query
    select m.id, m.role, m.name, m.restaurant_id, r.name
    from public.makan_market_members m
    left join public.makan_restaurants r on r.id = m.restaurant_id
    where m.user_id = auth.uid()
    order by m.created_at;
end $$;

create or replace function public.makan_market_feed()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m public.makan_market_members%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() order by created_at limit 1;
  if m.id is null then
    return jsonb_build_object('restaurants', '[]'::jsonb, 'items', '[]'::jsonb, 'orders', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'restaurants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'area', r.area, 'cuisine', r.cuisine,
        'halal', r.halal, 'etaMin', r.eta_min, 'vendorId', coalesce(r.vendor_email, '')))
      from public.makan_restaurants r where r.active), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'restaurantId', i.restaurant_id, 'name', i.name, 'description', i.description,
        'priceSen', i.price_sen, 'available', i.available))
      from public.makan_menu_items i
      where i.available or m.role = 'admin' or (m.role = 'vendor' and i.restaurant_id = m.restaurant_id)), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(x.obj order by x.placed_at desc)
      from (
        select c.placed_at, jsonb_build_object(
          'id', c.id,
          'customerId', c.customer_member_id,
          'customerName', coalesce(cu.name, cu.email),
          'restaurantId', c.restaurant_id,
          'status', c.status,
          'address', c.address,
          'note', c.note,
          'placedAt', (extract(epoch from c.placed_at) * 1000)::bigint,
          'riderId', c.rider_member_id,
          'riderName', ri.name,
          'lines', coalesce((
            select jsonb_agg(jsonb_build_object('itemId', l.item_id, 'name', l.name, 'qty', l.qty, 'priceSen', l.price_sen))
            from public.makan_consumer_order_lines l where l.order_id = c.id), '[]'::jsonb)
        ) as obj
        from public.makan_consumer_orders c
        join public.makan_market_members cu on cu.id = c.customer_member_id
        left join public.makan_market_members ri on ri.id = c.rider_member_id
        where (m.role = 'admin')
          or (m.role = 'customer' and c.customer_member_id = m.id)
          or (m.role = 'vendor' and c.restaurant_id = m.restaurant_id and c.status <> 'awaiting_payment')
          or (m.role = 'rider' and ((c.status = 'ready' and c.rider_member_id is null) or c.rider_member_id = m.id))
      ) x), '[]'::jsonb)
  );
end $$;

create or replace function public.makan_place_order(p_restaurant text, p_address text, p_note text, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m public.makan_market_members%rowtype;
  v_id text; v_total int := 0; i int; v_line jsonb; v_item public.makan_menu_items%rowtype; v_qty int;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() and role = 'customer' limit 1;
  if m.id is null then raise exception 'customers only'; end if;
  if length(btrim(coalesce(p_address, ''))) < 4 then raise exception 'add a delivery address'; end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 1 or jsonb_array_length(p_lines) > 20 then
    raise exception 'cart is empty';
  end if;
  for i in 0 .. jsonb_array_length(p_lines) - 1 loop
    v_line := p_lines -> i;
    v_qty := (v_line->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'bad quantity'; end if;
    select * into v_item from public.makan_menu_items
      where id = v_line->>'itemId' and restaurant_id = p_restaurant and available;
    if v_item.id is null then raise exception 'a dish is no longer available'; end if;
    v_total := v_total + v_item.price_sen * v_qty;
  end loop;
  if v_total < 200 or v_total > 3000000 then raise exception 'order total is outside the RM 2 to RM 30,000 payment range'; end if;
  v_id := 'mkt-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.makan_consumer_orders (id, customer_member_id, restaurant_id, status, address, note, total_sen)
    values (v_id, m.id, p_restaurant, 'awaiting_payment', btrim(p_address), coalesce(btrim(p_note), ''), v_total);
  for i in 0 .. jsonb_array_length(p_lines) - 1 loop
    v_line := p_lines -> i;
    select * into v_item from public.makan_menu_items where id = v_line->>'itemId';
    insert into public.makan_consumer_order_lines (order_id, item_id, name, qty, price_sen)
      values (v_id, v_item.id, v_item.name, (v_line->>'qty')::int, v_item.price_sen);
  end loop;
  return jsonb_build_object('id', v_id, 'totalSen', v_total);
end $$;

create or replace function public.makan_vendor_advance(p_order text)
returns text language plpgsql security definer set search_path = public as $$
declare m public.makan_market_members%rowtype; o public.makan_consumer_orders%rowtype; v_next text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() and role = 'vendor' limit 1;
  if m.id is null or m.restaurant_id is null then raise exception 'vendors only'; end if;
  select * into o from public.makan_consumer_orders where id = p_order and restaurant_id = m.restaurant_id for update;
  if o.id is null then raise exception 'order not found'; end if;
  v_next := case o.status when 'placed' then 'accepted' when 'accepted' then 'preparing' when 'preparing' then 'ready' else null end;
  if v_next is null then raise exception 'this order cannot be moved forward'; end if;
  update public.makan_consumer_orders set status = v_next where id = o.id;
  return v_next;
end $$;

create or replace function public.makan_rider_pickup(p_order text)
returns text language plpgsql security definer set search_path = public as $$
declare m public.makan_market_members%rowtype; o public.makan_consumer_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() and role = 'rider' limit 1;
  if m.id is null then raise exception 'riders only'; end if;
  select * into o from public.makan_consumer_orders where id = p_order for update;
  if o.id is null or o.status <> 'ready' or o.rider_member_id is not null then raise exception 'that order is not ready'; end if;
  update public.makan_consumer_orders set status = 'picked_up', rider_member_id = m.id where id = o.id;
  return 'picked_up';
end $$;

create or replace function public.makan_rider_deliver(p_order text)
returns text language plpgsql security definer set search_path = public as $$
declare m public.makan_market_members%rowtype; o public.makan_consumer_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() and role = 'rider' limit 1;
  if m.id is null then raise exception 'riders only'; end if;
  select * into o from public.makan_consumer_orders where id = p_order for update;
  if o.id is null or o.status <> 'picked_up' or o.rider_member_id <> m.id then raise exception 'that delivery is not yours'; end if;
  update public.makan_consumer_orders set status = 'delivered' where id = o.id;
  return 'delivered';
end $$;

create or replace function public.makan_vendor_toggle(p_item text)
returns boolean language plpgsql security definer set search_path = public as $$
declare m public.makan_market_members%rowtype; v_on boolean;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into m from public.makan_market_members where user_id = auth.uid() and role = 'vendor' limit 1;
  if m.id is null or m.restaurant_id is null then raise exception 'vendors only'; end if;
  update public.makan_menu_items set available = not available
    where id = p_item and restaurant_id = m.restaurant_id
    returning available into v_on;
  if v_on is null then raise exception 'dish not found'; end if;
  return v_on;
end $$;

revoke all on function public.makan_claim_market() from public, anon;
revoke all on function public.makan_market_feed() from public, anon;
revoke all on function public.makan_place_order(text, text, text, jsonb) from public, anon;
revoke all on function public.makan_vendor_advance(text) from public, anon;
revoke all on function public.makan_rider_pickup(text) from public, anon;
revoke all on function public.makan_rider_deliver(text) from public, anon;
revoke all on function public.makan_vendor_toggle(text) from public, anon;
grant execute on function public.makan_claim_market() to authenticated;
grant execute on function public.makan_market_feed() to authenticated;
grant execute on function public.makan_place_order(text, text, text, jsonb) to authenticated;
grant execute on function public.makan_vendor_advance(text) to authenticated;
grant execute on function public.makan_rider_pickup(text) to authenticated;
grant execute on function public.makan_rider_deliver(text) to authenticated;
grant execute on function public.makan_vendor_toggle(text) to authenticated;

-- The payment routes use the service role. They never use the anon key.
grant select, update on public.makan_consumer_orders to service_role;
grant select on public.makan_market_members to service_role;

notify pgrst, 'reload schema';
