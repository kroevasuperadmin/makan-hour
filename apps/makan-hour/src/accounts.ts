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
}
// Demo accounts. The role comes from the account, never from a switch inside the app.
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
export const findAccount = (email: string) => ACCOUNTS.find(a => a.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
export const accountTestId = (a: Account) => (a.surface === 'market' && a.role === 'admin' ? 'account-market-admin' : `account-${a.role}`);
