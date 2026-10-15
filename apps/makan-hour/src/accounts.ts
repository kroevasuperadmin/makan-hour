import { Role } from '@makan/core';
// real = signed in through Supabase Auth (not one of the demo accounts); officeId is set for real accounts.
export interface Account { role: Role; email: string; name: string; org: string; detail: string; real?: boolean; officeId?: string; }
// Demo accounts. The role comes from the account, never from a switch inside the app.
export const ACCOUNTS: Account[] = [
  { role: 'employee', email: 'aina@contoh-capital.my', name: 'Aina Rahman', org: 'Contoh Capital Sdn Bhd', detail: 'Employee · Level 12, Bangsar South' },
  { role: 'admin', email: 'nadia.admin@contoh-capital.my', name: 'Nadia Osman', org: 'Contoh Capital Sdn Bhd', detail: 'Office admin · budget and invoices' },
  { role: 'caterer', email: 'ops@dapurcontoh.my', name: 'Dapur Contoh Catering', org: 'Kampung Kerinchi kitchen', detail: 'Caterer · batches, labels and drops' },
];
export const DEMO_CODE = '220126';
export const findAccount = (email: string) => ACCOUNTS.find(a => a.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
