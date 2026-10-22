// Payments through Stripe Checkout (FPX and card, MYR). The secret key never ships in the app:
// the app calls our server routes (apps/makan-hour/api/pay/*), which hold the key.
import { openDemoOn } from './open-demo';
const API = (process.env.EXPO_PUBLIC_API_URL || 'https://makanhour.rizqey.com/app').replace(/\/$/, '');

export type Checkout = { id: string; url: string; test: boolean };
export type CheckoutState = { id: string; paid: boolean; state: string; amountSen: number; method: string | null; ref: string | null };
export class PayNotConfigured extends Error {}
// Demo accounts never reach a live Stripe key: only real (signed-up) accounts may pay for real.
let realPayments = false;
export const setRealPayments = (on: boolean) => { realPayments = on; };

export async function createCheckout(p: { kind: 'invoice' | 'topup' | 'order'; ref: string; amountSen: number; email: string; description: string; token?: string }): Promise<Checkout> {
  if (openDemoOn()) throw new PayNotConfigured('Open demo does not take payment');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (p.token) headers.authorization = `Bearer ${p.token}`;
  const { token: _token, ...body } = p;
  const r = await fetch(`${API}/api/pay/create`, { method: 'POST', headers, body: JSON.stringify({ ...body, real: realPayments }) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 503 || (r.status === 403 && j.demo)) throw new PayNotConfigured(j.error || 'Payments are not set up on the server');
  if (!r.ok) throw new Error(j.error || `Payment server error ${r.status}`);
  return j as Checkout;
}
export async function checkoutStatus(id: string): Promise<CheckoutState> {
  const r = await fetch(`${API}/api/pay/status?id=${encodeURIComponent(id)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Payment server error ${r.status}`);
  return j as CheckoutState;
}
