// Cheap checks for the marketplace database switch. No network. No keys.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isMarketDoor, ordersVisibleTo, pickMarketDoor, restaurantIdForVendor, seedMarket, type MarketOrder } from '../packages/core/src/market.ts';
import { marketplaceDbOn, requireMarketplaceDb } from '../packages/core/src/market-flag.ts';

assert.equal(marketplaceDbOn({}), false);
assert.equal(marketplaceDbOn({ MAKAN_MARKETPLACE_DB: 'on' }), true);
assert.equal(marketplaceDbOn({ EXPO_PUBLIC_MAKAN_MARKETPLACE_DB: 'on' }), true);
assert.equal(marketplaceDbOn({ MAKAN_MARKETPLACE_DB: 'ON' }), false);
assert.equal(marketplaceDbOn({ MAKAN_MARKETPLACE_DB: '1' }), false);
assert.equal(marketplaceDbOn({ MAKAN_MARKETPLACE_DB: 'true' }), false);
assert.equal(marketplaceDbOn({ EXPO_PUBLIC_MAKAN_MARKETPLACE_DB: 'off', MAKAN_MARKETPLACE_DB: 'on' }), false);
assert.equal(marketplaceDbOn(), false, 'this process must not turn the database on');

assert.equal(isMarketDoor('customer') && isMarketDoor('vendor') && isMarketDoor('rider') && isMarketDoor('admin'), true);
assert.equal(isMarketDoor('employee') || isMarketDoor('caterer'), false);

const members = [
  { id: 'office-admin', email: 'nadia.admin@contoh-capital.my', role: 'admin' },
  { id: 'staff', email: 'aina@contoh-capital.my', role: 'employee' },
  { id: 'kitchen', email: 'ops@dapurcontoh.my', role: 'caterer' },
  { id: 'cust', email: 'siti.market@contoh.my', role: 'customer' },
];
assert.equal(pickMarketDoor(members, 'customer')?.id, 'cust');
assert.equal(pickMarketDoor(members, 'vendor'), null);
assert.equal(pickMarketDoor(members, 'admin')?.id, 'office-admin');
assert.equal(pickMarketDoor(members.filter(m => m.role === 'employee'), 'customer'), null);

assert.equal(restaurantIdForVendor('Vendor.Market@DapurContoh.my', [
  { id: 'r1', vendorEmail: 'vendor.market@dapurcontoh.my' },
  { id: 'r2', vendorEmail: null },
]), 'r1');
assert.equal(restaurantIdForVendor('faiz.market@contoh.my', [{ id: 'r1', vendorEmail: 'vendor.market@dapurcontoh.my' }]), null);

const awaiting: MarketOrder = {
  id: 'mkt-unpaid', customerId: 'cust-other', customerName: 'Other', restaurantId: 'r1',
  status: 'awaiting_payment', address: 'Level 1', note: '', placedAt: 1,
  lines: [], riderId: null, riderName: null,
};
const taken: MarketOrder = {
  id: 'mkt-other-rider', customerId: 'cust-hafiz', customerName: 'Hafiz Rahman', restaurantId: 'r2',
  status: 'picked_up', address: 'Level 3', note: '', placedAt: 2,
  lines: [], riderId: 'ride-other', riderName: 'Other Rider',
};
const orders = [...seedMarket().orders, awaiting, taken];

const admin = ordersVisibleTo('admin', 'admin-desk', null, orders);
assert.equal(admin.length, orders.length, 'admin sees every marketplace order');
assert.ok(admin.some(o => o.id === 'mkt-unpaid' && o.customerId !== 'admin-desk'));

const customer = ordersVisibleTo('customer', 'cust-siti', null, orders);
assert.ok(customer.length > 0 && customer.every(o => o.customerId === 'cust-siti'));
assert.equal(customer.some(o => o.id === 'mkt-unpaid'), false);

const vendor = ordersVisibleTo('vendor', 'vend-dapur', 'r1', orders);
assert.ok(vendor.every(o => o.restaurantId === 'r1' && o.status !== 'awaiting_payment'));
assert.equal(vendor.some(o => o.restaurantId === 'r2'), false);

const rider = ordersVisibleTo('rider', 'ride-faiz', null, orders);
assert.ok(rider.some(o => o.status === 'ready' && !o.riderId));
assert.ok(rider.some(o => o.riderId === 'ride-faiz'));
assert.equal(rider.some(o => o.id === 'mkt-other-rider'), false);
assert.equal(rider.some(o => o.status === 'awaiting_payment'), false);

const dbSrc = readFileSync(new URL('../packages/core/src/market-db.ts', import.meta.url), 'utf8');
const gateAt = dbSrc.indexOf('requireMarketplaceDb()');
const rpcAt = dbSrc.indexOf("rpc('makan_claim_market'");
assert.ok(gateAt !== -1 && rpcAt !== -1 && gateAt < rpcAt);

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const step5 = readme.indexOf('supabase/makan_migration_5_marketplace.sql');
const stepRoles = readme.indexOf('supabase/makan_members_market_roles.sql');
const step6 = readme.indexOf('supabase/makan_migration_6_marketplace_rls.sql');
assert.ok(step5 !== -1 && stepRoles !== -1 && step6 !== -1 && step5 < stepRoles && stepRoles < step6);
assert.match(readme, /MAKAN_MARKETPLACE_DB=on/);
assert.match(readme, /EXPO_PUBLIC_MAKAN_MARKETPLACE_DB/);

const sql = (name: string) => readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8');
const m5 = sql('makan_migration_5_marketplace.sql');
const roles = sql('makan_members_market_roles.sql');
const m6 = sql('makan_migration_6_marketplace_rls.sql');
for (const table of ['makan_restaurants', 'makan_menu_items', 'makan_market_members', 'makan_consumer_orders', 'makan_consumer_order_lines']) {
  assert.match(m5, new RegExp(`create table if not exists public\\.${table}\\b`));
}
assert.doesNotMatch(m5, /alter table\s+(if exists\s+)?(public\.)?makan_members\b/i);
assert.match(roles, /'customer', 'vendor', 'rider'/);
assert.match(roles, /'admin', 'employee', 'caterer', 'customer', 'vendor', 'rider'/);
assert.doesNotMatch(roles, /\bdelete\s+from\b/i);
assert.doesNotMatch(roles, /\bdrop\s+table\b/i);
assert.doesNotMatch(roles, /\btruncate\b/i);
assert.match(m6, /from public\.makan_members/);
assert.match(m6, /p_role = 'admin'/);
assert.doesNotMatch(m6, /whatsapp/i);
const bundled = m5 + roles + m6 + readme + dbSrc;
assert.doesNotMatch(bundled, /eyJ[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(bundled, /sk_live_|sbp_[A-Za-z0-9]/);

const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
assert.match(envExample, /^# EXPO_PUBLIC_MAKAN_MARKETPLACE_DB=on$/m);
assert.doesNotMatch(envExample, /^EXPO_PUBLIC_MAKAN_MARKETPLACE_DB=on$/m);

assert.throws(() => requireMarketplaceDb({}), /Marketplace database is off/);
assert.doesNotThrow(() => requireMarketplaceDb({ MAKAN_MARKETPLACE_DB: 'on' }));
assert.throws(() => requireMarketplaceDb({ EXPO_PUBLIC_MAKAN_MARKETPLACE_DB: 'off', MAKAN_MARKETPLACE_DB: 'on' }), /Marketplace database is off/);

console.log('market db flag ok');
