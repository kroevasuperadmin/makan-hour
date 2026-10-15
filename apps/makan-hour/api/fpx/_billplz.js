// Shared Billplz helpers. Keys come from Vercel env vars only; nothing secret is in the repo.
//   BILLPLZ_API_KEY        secret key (sandbox or live)
//   BILLPLZ_COLLECTION_ID  collection the bills go into
//   BILLPLZ_X_SIGNATURE    X Signature key, used to verify callbacks
//   BILLPLZ_SANDBOX        "1" for https://www.billplz-sandbox.com (default), "0" for live
const crypto = require('crypto');
const sandbox = process.env.BILLPLZ_SANDBOX !== '0';
const base = sandbox ? 'https://www.billplz-sandbox.com/api/v3' : 'https://www.billplz.com/api/v3';
const configured = () => Boolean(process.env.BILLPLZ_API_KEY && process.env.BILLPLZ_COLLECTION_ID);
async function call(path, init = {}) {
  const auth = Buffer.from(`${process.env.BILLPLZ_API_KEY}:`).toString('base64');
  const r = await fetch(base + path, { ...init, headers: { authorization: `Basic ${auth}`, ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j.error && (j.error.message || JSON.stringify(j.error))) || `Billplz ${r.status}`); e.status = r.status; throw e; }
  return j;
}
// Billplz X Signature: sort key+value pairs (excluding x_signature), join with "|", HMAC-SHA256.
function verify(params) {
  const key = process.env.BILLPLZ_X_SIGNATURE; if (!key) return false;
  const src = Object.keys(params).filter(k => k !== 'x_signature').sort().map(k => `${k}${params[k] ?? ''}`).join('|');
  const sig = crypto.createHmac('sha256', key).update(src).digest('hex');
  const got = String(params.x_signature || '');
  return got.length === sig.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(got));
}
function cors(res) { res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); }
module.exports = { sandbox, configured, call, verify, cors };
