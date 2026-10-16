// Deletes the signed-in user's Makan Hour account. Called by the in-app "Delete account" flow.
// Auth: the user's Supabase access token as "Authorization: Bearer <token>". The server checks it
// with Supabase Auth, then uses the service role (Vercel env SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) to:
//   1. anonymise their orders (employee_id -> 'deleted'), keeping the records for accounting
//   2. delete their push tokens
//   3. hand offices they created to another signed-up member (admins first); an office with
//      nobody else signed up is deleted, with its pending invites
//   4. delete their member rows (name, email, role)
//   5. delete the auth user
// Demo accounts never reach Supabase Auth, so they can't be deleted here; the app resets the demo instead.
const { sb, sbReady } = require('../push/_lib');
const DEMO = new Set(['aina@contoh-capital.my', 'nadia.admin@contoh-capital.my', 'ops@dapurcontoh.my']);
const base = () => process.env.SUPABASE_URL.replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const list = ids => `(${ids.map(i => `"${String(i).replace(/"/g, '')}"`).join(',')})`;

module.exports = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type, authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!sbReady()) return res.status(503).json({ error: 'Account deletion is not configured on this server.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in first' });
  const ur = await fetch(`${base()}/auth/v1/user`, { headers: { apikey: key(), authorization: `Bearer ${token}` } });
  if (!ur.ok) return res.status(401).json({ error: 'Your session has expired. Sign in again, then delete.' });
  const user = await ur.json();
  const uid = user.id, email = String(user.email || '').toLowerCase();
  if (!/^[0-9a-f-]{36}$/i.test(uid)) return res.status(401).json({ error: 'Sign in first' });
  if (DEMO.has(email)) return res.status(403).json({ error: 'Demo accounts can only be reset.', demo: true });
  try {
    const mine = await sb(`makan_members?user_id=eq.${uid}&select=id`);
    const ids = [uid, ...mine.map(m => m.id)];
    await sb(`makan_orders?employee_id=in.${list(ids)}`, { method: 'PATCH', body: JSON.stringify({ employee_id: 'deleted' }) });
    await sb(`makan_push_tokens?employee_id=in.${list(ids)}`, { method: 'DELETE' });
    const offices = await sb(`makan_offices?created_by=eq.${uid}&select=id`);
    let handedOver = 0, officesDeleted = 0;
    for (const o of offices) {
      const others = await sb(`makan_members?office_id=eq.${o.id}&user_id=not.is.null&user_id=neq.${uid}&select=user_id,role,created_at&order=created_at`);
      const next = others.find(m => m.role === 'admin') || others[0];
      if (next) { await sb(`makan_offices?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ created_by: next.user_id }) }); handedOver++; }
      else { await sb(`makan_offices?id=eq.${o.id}`, { method: 'DELETE' }); officesDeleted++; }
    }
    await sb(`makan_members?user_id=eq.${uid}`, { method: 'DELETE' });
    const d = await fetch(`${base()}/auth/v1/admin/users/${uid}`, { method: 'DELETE', headers: { apikey: key(), authorization: `Bearer ${key()}` } });
    if (!d.ok) throw new Error(`Auth delete ${d.status}: ${(await d.text()).slice(0, 200)}`);
    res.status(200).json({ ok: true, handedOver, officesDeleted });
  } catch (e) { res.status(502).json({ error: 'Deletion did not finish. Try again or email admin@kroeva.com.', detail: e.message }); }
};
