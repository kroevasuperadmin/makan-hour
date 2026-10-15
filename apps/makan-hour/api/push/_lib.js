// Server push for late drops, sent straight to APNs (no EAS / Expo push service needed).
// Vercel env vars (never in git):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   read/write makan_push_tokens (no anon access)
//   APNS_KEY_P8 (contents of the .p8), APNS_KEY_ID, APNS_TEAM_ID (4PX34WYHUB)
//   APNS_TOPIC (my.makanhour.app), APNS_PRODUCTION ("1" for TestFlight/App Store builds)
const crypto = require('crypto');
const http2 = require('http2');

const sbReady = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const apnsReady = () => Boolean(process.env.APNS_KEY_P8 && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID);
async function sb(path, init = {}) {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, { ...init, headers: { apikey: k, authorization: `Bearer ${k}`, 'content-type': 'application/json', ...(init.headers || {}) } });
  const t = await r.text(); if (!r.ok) throw new Error(`Supabase ${r.status}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
let jwtCache = { t: '', at: 0 };
function apnsJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (jwtCache.t && now - jwtCache.at < 3000) return jwtCache.t;
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'ES256', kid: process.env.APNS_KEY_ID }), body = b64({ iss: process.env.APNS_TEAM_ID, iat: now });
  const sig = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: process.env.APNS_KEY_P8.replace(/\\n/g, '\n'), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  jwtCache = { t: `${head}.${body}.${sig}`, at: now }; return jwtCache.t;
}
function sendApns(tokens, payload) {
  const host = process.env.APNS_PRODUCTION === '0' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  const topic = process.env.APNS_TOPIC || 'my.makanhour.app';
  return new Promise(resolve => {
    const c = http2.connect(host); const out = []; let left = tokens.length;
    if (!left) { c.close(); return resolve(out); }
    c.on('error', e => { tokens.forEach(t => out.push({ token: t, status: 0, reason: e.message })); c.close(); resolve(out); });
    for (const t of tokens) {
      const req = c.request({ ':method': 'POST', ':path': `/3/device/${t}`, authorization: `bearer ${apnsJwt()}`, 'apns-topic': topic, 'apns-push-type': 'alert', 'apns-priority': '10' });
      let status = 0, data = '';
      req.on('response', h => { status = h[':status']; }); req.on('data', d => { data += d; });
      req.on('end', () => { out.push({ token: t, status, reason: data ? (JSON.parse(data).reason || '') : '' }); if (--left === 0) { c.close(); resolve(out); } });
      req.end(JSON.stringify(payload));
    }
  });
}
function cors(res) { res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); }
module.exports = { sb, sbReady, apnsReady, sendApns, cors };
