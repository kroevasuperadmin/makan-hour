// FPX payments through Billplz. The secret key never ships in the app: the app calls
// our own server routes (apps/makan-hour/api/fpx/*), which hold the key and talk to Billplz.
const API = (process.env.EXPO_PUBLIC_API_URL || 'https://makan-hour-app.vercel.app').replace(/\/$/, '');

export type Bill = { id: string; url: string; sandbox: boolean };
export type BillState = { id: string; paid: boolean; state: string; paidAt: string | null; amountSen: number };
export class PayNotConfigured extends Error {}

export async function createBill(p: { kind: 'invoice' | 'topup'; ref: string; amountSen: number; name: string; email: string; description: string }): Promise<Bill> {
  const r = await fetch(`${API}/api/fpx/create`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 503) throw new PayNotConfigured(j.error || 'FPX is not configured on the server');
  if (!r.ok) throw new Error(j.error || `Payment server error ${r.status}`);
  return j as Bill;
}
export async function billStatus(id: string): Promise<BillState> {
  const r = await fetch(`${API}/api/fpx/status?id=${encodeURIComponent(id)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Payment server error ${r.status}`);
  return j as BillState;
}
