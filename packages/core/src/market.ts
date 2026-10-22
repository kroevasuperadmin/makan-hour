// Marketplace preview. This module never imports the Supabase client and never applies SQL.
// Orders, carts and menu toggles stay in memory unless MAKAN_MARKETPLACE_DB=on (market-flag.ts).
// The tables live in supabase/makan_migration_5_marketplace.sql. Roles are read from makan_members.

export type MarketStatus = 'awaiting_payment' | 'placed' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

export interface Restaurant {
  id: string;
  name: string;
  area: string;
  cuisine: string;
  halal: boolean;
  etaMin: number;
  vendorId: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  priceSen: number;
  available: boolean;
}

export interface CartLine { itemId: string; qty: number; }

export interface MarketLine { itemId: string; name: string; qty: number; priceSen: number; }

export interface MarketOrder {
  id: string;
  customerId: string;
  customerName: string;
  restaurantId: string;
  status: MarketStatus;
  address: string;
  note: string;
  placedAt: number;
  lines: MarketLine[];
  riderId: string | null;
  riderName: string | null;
}

export interface MarketState {
  restaurants: Restaurant[];
  items: MenuItem[];
  orders: MarketOrder[];
  cart: CartLine[];
  seq: number;
}

export type MarketAction =
  | { t: 'add'; itemId: string; replace?: boolean }
  | { t: 'setQty'; itemId: string; qty: number }
  | { t: 'clearCart' }
  | { t: 'place'; customerId: string; customerName: string; address: string; note: string; at: number }
  | { t: 'vendor'; orderId: string; restaurantId: string; to: MarketStatus }
  | { t: 'pickup'; orderId: string; riderId: string; riderName: string }
  | { t: 'deliver'; orderId: string; riderId: string }
  | { t: 'toggle'; itemId: string; vendorId: string }
  | { t: 'reset' };

export const STATUS_LABEL: Record<MarketStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  placed: 'Placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const restaurants: Restaurant[] = [
  { id: 'r1', name: 'Dapur Contoh', area: 'Kampung Kerinchi', cuisine: 'Malay', halal: true, etaMin: 30, vendorId: 'vend-dapur' },
  { id: 'r2', name: 'Rasa Sampel', area: 'Brickfields', cuisine: 'Mamak', halal: true, etaMin: 25, vendorId: 'vend-rasa' },
  { id: 'r3', name: 'Kedai Contoh', area: 'Bangsar South', cuisine: 'Noodles', halal: false, etaMin: 20, vendorId: 'vend-kedai' },
];

const menu: MenuItem[] = [
  { id: 'i-ayam', restaurantId: 'r1', name: 'Nasi Ayam Hainan', description: 'Roasted chicken, stock rice, chilli-ginger sauce', priceSen: 1390, available: true },
  { id: 'i-lemak', restaurantId: 'r1', name: 'Nasi Lemak Ayam Berempah', description: 'Spiced chicken, sambal, egg, cucumber', priceSen: 1450, available: true },
  { id: 'i-kandar', restaurantId: 'r1', name: 'Nasi Kandar Ayam Madu', description: 'Honey chicken, mixed curry, papadom', priceSen: 1790, available: true },
  { id: 'i-mee', restaurantId: 'r2', name: 'Mee Goreng Mamak', description: 'Wok-fried noodles, tofu, lime', priceSen: 1200, available: true },
  { id: 'i-roti', restaurantId: 'r2', name: 'Roti Canai Telur', description: 'Two pieces, dhal and fish curry', priceSen: 650, available: true },
  { id: 'i-teh', restaurantId: 'r2', name: 'Teh Tarik', description: 'Pulled milk tea, less sweet', priceSen: 350, available: true },
  { id: 'i-wantan', restaurantId: 'r3', name: 'Wantan Mee', description: 'Egg noodles, char siu, greens', priceSen: 1300, available: true },
  { id: 'i-horfun', restaurantId: 'r3', name: 'Ipoh Hor Fun', description: 'Flat rice noodles, prawn, chicken', priceSen: 1400, available: true },
  { id: 'i-veg', restaurantId: 'r3', name: 'Vegetable Noodle Soup', description: 'Clear broth, greens, tofu', priceSen: 1100, available: true },
];

function line(itemId: string, qty: number): MarketLine {
  const item = menu.find(i => i.id === itemId)!;
  return { itemId, name: item.name, qty, priceSen: item.priceSen };
}

const seedOrders: MarketOrder[] = [
  { id: 'mkt-seed-1', customerId: 'cust-hafiz', customerName: 'Hafiz Rahman', restaurantId: 'r1', status: 'placed', address: 'Level 8, Block 3, KL Sentral', note: '', placedAt: Date.parse('2026-10-22T11:40:00+08:00'), lines: [line('i-lemak', 1)], riderId: null, riderName: null },
  { id: 'mkt-seed-4', customerId: 'cust-arvind', customerName: 'Arvind Nair', restaurantId: 'r2', status: 'preparing', address: 'Level 3, Jalan Tun Sambanthan', note: '', placedAt: Date.parse('2026-10-22T11:25:00+08:00'), lines: [line('i-mee', 1), line('i-roti', 1)], riderId: null, riderName: null },
  { id: 'mkt-seed-2', customerId: 'cust-mei', customerName: 'Mei Ling Tan', restaurantId: 'r1', status: 'ready', address: 'Level 5, Tower A, Bangsar South', note: 'Leave with reception', placedAt: Date.parse('2026-10-22T11:10:00+08:00'), lines: [line('i-kandar', 1)], riderId: null, riderName: null },
  { id: 'mkt-seed-3', customerId: 'cust-siti', customerName: 'Siti Aminah', restaurantId: 'r1', status: 'delivered', address: 'Level 12, Tower B, Bangsar South', note: '', placedAt: Date.parse('2026-10-22T10:05:00+08:00'), lines: [line('i-ayam', 1)], riderId: 'ride-faiz', riderName: 'Faiz Rahman' },
];

export function seedMarket(): MarketState {
  return {
    restaurants,
    items: menu.map(i => ({ ...i })),
    orders: seedOrders.map(o => ({ ...o, lines: o.lines.map(l => ({ ...l })) })),
    cart: [],
    seq: 5,
  };
}

export function vendorNext(status: MarketStatus): MarketStatus | null {
  if (status === 'placed') return 'accepted';
  if (status === 'accepted') return 'preparing';
  if (status === 'preparing') return 'ready';
  return null;
}

export function vendorNextLabel(status: MarketStatus): string | null {
  if (status === 'placed') return 'Accept order';
  if (status === 'accepted') return 'Start preparing';
  if (status === 'preparing') return 'Ready for pickup';
  return null;
}

export function orderTotalSen(o: MarketOrder) {
  return o.lines.reduce((n, l) => n + l.priceSen * l.qty, 0);
}

export function cartCount(s: MarketState) {
  return s.cart.reduce((n, l) => n + l.qty, 0);
}

export function cartRestaurant(s: MarketState): Restaurant | null {
  const first = s.cart[0];
  if (!first) return null;
  const item = s.items.find(i => i.id === first.itemId);
  return item ? s.restaurants.find(r => r.id === item.restaurantId) ?? null : null;
}

export function cartTotalSen(s: MarketState) {
  return s.cart.reduce((n, l) => n + (s.items.find(i => i.id === l.itemId)?.priceSen ?? 0) * l.qty, 0);
}

export function whenLabel(ms: number) {
  return new Date(ms).toLocaleString('en-MY', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kuala_Lumpur' });
}

const OPEN: MarketStatus[] = ['awaiting_payment', 'placed', 'accepted', 'preparing', 'ready', 'picked_up'];
export const isOpenStatus = (status: MarketStatus) => OPEN.includes(status);

export type MarketDoor = 'customer' | 'vendor' | 'rider' | 'admin';

export function isMarketDoor(role: string): role is MarketDoor {
  return role === 'customer' || role === 'vendor' || role === 'rider' || role === 'admin';
}

// Admin sees every marketplace order, including unpaid ones. Everyone else sees a slice.
// Office-lunch orders are not in this list.
export function ordersVisibleTo(role: MarketDoor, actorId: string, restaurantId: string | null, orders: MarketOrder[]): MarketOrder[] {
  if (role === 'admin') return orders.slice();
  if (role === 'customer') return orders.filter(o => o.customerId === actorId);
  if (role === 'vendor') return orders.filter(o => o.restaurantId === restaurantId && o.status !== 'awaiting_payment');
  return orders.filter(o => (o.status === 'ready' && !o.riderId) || o.riderId === actorId);
}

export function pickMarketDoor<T extends { role: string }>(rows: T[], door: MarketDoor): T | null {
  const row = rows.find(r => r.role === door);
  return row ?? null;
}

// Migration 5 stores the vendor's address on makan_restaurants.vendor_email.
export function restaurantIdForVendor(email: string, restaurants: { id: string; vendorEmail?: string | null }[]): string | null {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  return restaurants.find(r => (r.vendorEmail ?? '').trim().toLowerCase() === e)?.id ?? null;
}

function mapOrder(s: MarketState, id: string, fn: (o: MarketOrder) => MarketOrder): MarketState {
  return { ...s, orders: s.orders.map(o => (o.id === id ? fn(o) : o)) };
}

export function reduceMarket(s: MarketState, a: MarketAction): MarketState {
  switch (a.t) {
    case 'reset': return seedMarket();
    case 'clearCart': return { ...s, cart: [] };
    case 'add': {
      const item = s.items.find(i => i.id === a.itemId);
      if (!item || !item.available) return s;
      const current = cartRestaurant(s);
      if (current && current.id !== item.restaurantId) {
        if (!a.replace) return s;
        return { ...s, cart: [{ itemId: item.id, qty: 1 }] };
      }
      const lineIn = s.cart.find(l => l.itemId === item.id);
      const cart = lineIn ? s.cart.map(l => (l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l)) : [...s.cart, { itemId: item.id, qty: 1 }];
      return { ...s, cart };
    }
    case 'setQty': {
      if (a.qty <= 0) return { ...s, cart: s.cart.filter(l => l.itemId !== a.itemId) };
      if (!s.cart.some(l => l.itemId === a.itemId)) return s;
      return { ...s, cart: s.cart.map(l => (l.itemId === a.itemId ? { ...l, qty: a.qty } : l)) };
    }
    case 'place': {
      const address = a.address.trim();
      if (address.length < 4 || !a.customerId) return s;
      const restaurant = cartRestaurant(s);
      if (!restaurant) return s;
      const lines: MarketLine[] = [];
      for (const l of s.cart) {
        const item = s.items.find(i => i.id === l.itemId);
        if (!item || !item.available || item.restaurantId !== restaurant.id) continue;
        lines.push({ itemId: item.id, name: item.name, qty: l.qty, priceSen: item.priceSen });
      }
      if (!lines.length) return s;
      const order: MarketOrder = {
        id: `mkt-${s.seq}`, customerId: a.customerId, customerName: a.customerName, restaurantId: restaurant.id,
        status: 'placed', address, note: a.note.trim(), placedAt: a.at, lines, riderId: null, riderName: null,
      };
      return { ...s, seq: s.seq + 1, cart: [], orders: [order, ...s.orders] };
    }
    case 'vendor': {
      const o = s.orders.find(x => x.id === a.orderId);
      if (!o || o.restaurantId !== a.restaurantId || vendorNext(o.status) !== a.to) return s;
      return mapOrder(s, o.id, x => ({ ...x, status: a.to }));
    }
    case 'pickup': {
      const o = s.orders.find(x => x.id === a.orderId);
      if (!o || o.status !== 'ready' || o.riderId) return s;
      return mapOrder(s, o.id, x => ({ ...x, status: 'picked_up', riderId: a.riderId, riderName: a.riderName }));
    }
    case 'deliver': {
      const o = s.orders.find(x => x.id === a.orderId);
      if (!o || o.status !== 'picked_up' || o.riderId !== a.riderId) return s;
      return mapOrder(s, o.id, x => ({ ...x, status: 'delivered' }));
    }
    case 'toggle': {
      const item = s.items.find(i => i.id === a.itemId);
      const restaurant = item && s.restaurants.find(r => r.id === item.restaurantId);
      if (!item || restaurant?.vendorId !== a.vendorId) return s;
      return { ...s, items: s.items.map(i => (i.id === item.id ? { ...i, available: !i.available } : i)) };
    }
    default: return s;
  }
}
