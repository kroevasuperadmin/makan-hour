import { cartCount, reduceMarket, seedMarket, vendorNext } from '../packages/core/src/market.ts';
import assert from 'node:assert/strict';

let s = seedMarket();
assert.equal(s.orders.length, 4);
assert.equal(vendorNext('placed'), 'accepted');
assert.equal(vendorNext('ready'), null);

s = reduceMarket(s, { t: 'add', itemId: 'i-ayam' });
s = reduceMarket(s, { t: 'add', itemId: 'i-lemak' });
assert.equal(cartCount(s), 2);
s = reduceMarket(s, { t: 'add', itemId: 'i-mee' });
assert.equal(cartCount(s), 2, 'other restaurant does not replace without replace');
s = reduceMarket(s, { t: 'add', itemId: 'i-mee', replace: true });
assert.equal(cartCount(s), 1);

s = seedMarket();
s = reduceMarket(s, { t: 'add', itemId: 'i-ayam' });
s = reduceMarket(s, { t: 'place', customerId: 'cust-siti', customerName: 'Siti Aminah', address: 'Level 12, Tower B', note: 'no chilli', at: 1_700_000_000_000 });
assert.equal(s.orders[0].id, 'mkt-5');
assert.equal(s.orders[0].status, 'placed');
assert.equal(s.cart.length, 0);
assert.equal(s.seq, 6);

const blocked = reduceMarket(s, { t: 'vendor', orderId: 'mkt-seed-4', restaurantId: 'r1', to: 'ready' });
assert.equal(blocked.orders.find(o => o.id === 'mkt-seed-4')!.status, 'preparing');

let o = s;
for (const to of ['accepted', 'preparing', 'ready'] as const) {
  o = reduceMarket(o, { t: 'vendor', orderId: 'mkt-5', restaurantId: 'r1', to });
  assert.equal(o.orders.find(x => x.id === 'mkt-5')!.status, to);
}
const skip = reduceMarket(o, { t: 'deliver', orderId: 'mkt-5', riderId: 'ride-faiz' });
assert.equal(skip.orders.find(x => x.id === 'mkt-5')!.status, 'ready');
o = reduceMarket(o, { t: 'pickup', orderId: 'mkt-5', riderId: 'ride-faiz', riderName: 'Faiz Rahman' });
const other = reduceMarket(o, { t: 'deliver', orderId: 'mkt-5', riderId: 'ride-other' });
assert.equal(other.orders.find(x => x.id === 'mkt-5')!.status, 'picked_up');
o = reduceMarket(o, { t: 'deliver', orderId: 'mkt-5', riderId: 'ride-faiz' });
assert.equal(o.orders.find(x => x.id === 'mkt-5')!.status, 'delivered');

const hidden = reduceMarket(o, { t: 'toggle', itemId: 'i-kandar', vendorId: 'vend-dapur' });
assert.equal(hidden.items.find(i => i.id === 'i-kandar')!.available, false);
const notMine = reduceMarket(hidden, { t: 'toggle', itemId: 'i-mee', vendorId: 'vend-dapur' });
assert.equal(notMine.items.find(i => i.id === 'i-mee')!.available, true);

const fresh = reduceMarket(o, { t: 'reset' });
assert.equal(fresh.orders.length, 4);
assert.equal(fresh.cart.length, 0);
console.log('market reducer ok');
