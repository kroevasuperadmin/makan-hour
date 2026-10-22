// Marketplace orders. Service role stays on the server (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
// A customer checkout is marked placed only after Stripe says the session is paid.
const { sb, sbReady } = require('../push/_lib');

const idOk = id => /^mkt-[a-z0-9]{8,40}$/.test(id);
async function authUser(token) {
  const r = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.email ? { id: u.id, email: String(u.email).toLowerCase() } : null;
}
async function loadOrder(id) {
  const rows = await sb(`makan_consumer_orders?id=eq.${id}&select=id,status,total_sen,customer_member_id,stripe_session_id`);
  return rows?.[0] ?? null;
}
async function ownerEmail(memberId) {
  const rows = await sb(`makan_market_members?id=eq.${memberId}&select=email`);
  return rows?.[0]?.email ? String(rows[0].email).toLowerCase() : null;
}
async function saveSession(id, sessionId) {
  await sb(`makan_consumer_orders?id=eq.${id}&status=eq.awaiting_payment`, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ stripe_session_id: sessionId }),
  });
}
// Idempotent. A second paid session cannot move an order that is already placed.
async function markPaid(orderId, sessionId, ref, via) {
  const rows = await sb(`makan_consumer_orders?id=eq.${orderId}&status=eq.awaiting_payment`, {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({ status: 'placed', stripe_session_id: sessionId, paid_ref: ref || null, paid_via: via || null }),
  });
  return Array.isArray(rows) ? rows.length > 0 : false;
}
module.exports = { sbReady, idOk, authUser, loadOrder, ownerEmail, saveSession, markPaid };
