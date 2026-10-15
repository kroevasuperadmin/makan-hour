// Stripe helpers. Keys live in Vercel env only: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
const crypto = require('crypto');
const configured = () => Boolean(process.env.STRIPE_SECRET_KEY);
const testMode = () => String(process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_');
// Stripe wants form encoding with bracketed keys for nested values.
function form(obj, pre = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = pre ? `${pre}[${k}]` : k;
    if (v && typeof v === 'object') form(v, key, out); else if (v !== undefined && v !== null) out.append(key, String(v));
  }
  return out;
}
async function stripe(path, body) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
    body: body ? form(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && j.error.message) || `Stripe ${r.status}`); e.status = r.status; throw e; }
  return j;
}
// Verifies a Stripe-Signature header (t=...,v1=...) against the raw body. Five-minute tolerance.
function verifySig(raw, header, secret) {
  if (!header || !secret) return false;
  const t = Number((header.split(',').find(p => p.startsWith('t=')) || '').slice(2));
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = crypto.createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return header.split(',').filter(p => p.startsWith('v1=')).some(p => { const got = p.slice(3); return got.length === want.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want)); });
}
function cors(res) { res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); }
module.exports = { configured, testMode, stripe, verifySig, cors };
