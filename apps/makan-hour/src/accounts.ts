import { Role } from '@makan/core';
// real = signed in through Supabase Auth (not one of the demo accounts); officeId is set for real accounts.
// surface office = corporate catering. surface market = customer / vendor / rider / platform admin preview.
export type Surface = 'office' | 'market';
export type MarketRole = 'customer' | 'vendor' | 'rider';
export interface Account {
  role: Role | MarketRole;
  surface: Surface;
  email: string;
  name: string;
  org: string;
  detail: string;
  real?: boolean;
  officeId?: string;
  actorId?: string;
  restaurantId?: string;
  dropAddress?: string;
  // Set for an account created while MAKAN_OPEN_DEMO=on. real stays false so
  // the marketplace screens keep the in-memory sample kitchens.
  openDemo?: boolean;
  openCustomerId?: string;
  openRiderId?: string;
}
export type MarketSide = 'customer' | 'vendor' | 'rider' | 'admin';
// Demo accounts. The role comes from the account, unless MAKAN_OPEN_DEMO=on.
// Office lunch stays available unless EXPO_PUBLIC_CORPORATE=0.
export const corporateFlowOn = process.env.EXPO_PUBLIC_CORPORATE !== '0';
export const OFFICE_ACCOUNTS: Account[] = [
  { role: 'employee', surface: 'office', email: 'aina@contoh-capital.my', name: 'Aina Rahman', org: 'Contoh Capital Sdn Bhd', detail: 'Employee · Level 12, Bangsar South' },
  { role: 'admin', surface: 'office', email: 'nadia.admin@contoh-capital.my', name: 'Nadia Osman', org: 'Contoh Capital Sdn Bhd', detail: 'Office admin · budget and invoices' },
  { role: 'caterer', surface: 'office', email: 'ops@dapurcontoh.my', name: 'Dapur Contoh Catering', org: 'Kampung Kerinchi kitchen', detail: 'Caterer · batches, labels and drops' },
];
export const MARKET_ACCOUNTS: Account[] = [
  { role: 'customer', surface: 'market', email: 'siti@contoh.my', name: 'Siti Aminah', org: 'Bangsar South', detail: 'Customer · browse, cart and orders', actorId: 'cust-siti', dropAddress: 'Level 12, Tower B, Bangsar South' },
  { role: 'vendor', surface: 'market', email: 'vendor@dapurcontoh.my', name: 'Dapur Contoh', org: 'Kampung Kerinchi', detail: 'Vendor · menu and the order queue', actorId: 'vend-dapur', restaurantId: 'r1' },
  { role: 'rider', surface: 'market', email: 'faiz.rider@contoh.my', name: 'Faiz Rahman', org: 'Rider 07', detail: 'Rider · pick up and deliver', actorId: 'ride-faiz' },
  { role: 'admin', surface: 'market', email: 'desk@makanhour.example', name: 'Farah Lim', org: 'Makan Hour', detail: 'Admin · every marketplace order', actorId: 'admin-desk' },
];
export const ACCOUNTS: Account[] = [...MARKET_ACCOUNTS, ...OFFICE_ACCOUNTS];
export const DEMO_CODE = '220126';

function titleFromEmail(email: string) {
  const local = email.split('@')[0] || 'Guest';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// A new open-demo person starts as the customer. The role switcher moves them.
export function openDemoAccount(email: string, name?: string): Account {
  const who = email.trim().toLowerCase();
  const customerId = `open:${who}`;
  return {
    role: 'customer', surface: 'market', email: who, name: (name && name.trim()) || titleFromEmail(who),
    org: 'Open demo', detail: 'Customer · sample kitchens', real: false, openDemo: true,
    actorId: customerId, openCustomerId: customerId, openRiderId: `open-rider:${who}`,
    dropAddress: 'Level 12, Tower B, Bangsar South',
  };
}

// Same person, other side. Vendor is locked to the sample kitchen so the menu
// switch matches the in-memory reducer. Nothing here is a database id.
export function accountAsSide(a: Account, role: MarketSide): Account {
  const email = a.email.trim().toLowerCase();
  const customerId = a.openCustomerId ?? (a.role === 'customer' && a.actorId ? a.actorId : `open:${email}`);
  const riderId = a.openRiderId ?? (a.role === 'rider' && a.actorId ? a.actorId : `open-rider:${email}`);
  const base: Account = { ...a, email, surface: 'market', real: false, openDemo: true, openCustomerId: customerId, openRiderId: riderId, officeId: undefined };
  if (role === 'vendor') return { ...base, role, actorId: 'vend-dapur', restaurantId: 'r1', org: 'Dapur Contoh', detail: 'Vendor · sample menu and queue' };
  if (role === 'rider') return { ...base, role, actorId: riderId, restaurantId: undefined, org: 'Riders', detail: 'Rider · sample pickups' };
  if (role === 'admin') return { ...base, role, actorId: `open-admin:${email}`, restaurantId: undefined, org: 'Makan Hour', detail: 'Admin · sample orders' };
  return { ...base, role: 'customer', actorId: customerId, restaurantId: undefined, org: a.org || 'Open demo', detail: 'Customer · sample kitchens', dropAddress: a.dropAddress || 'Level 12, Tower B, Bangsar South' };
}
export const findAccount = (email: string) => ACCOUNTS.find(a => a.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
export const accountTestId = (a: Account) => (a.surface === 'market' && a.role === 'admin' ? 'account-market-admin' : `account-${a.role}`);
