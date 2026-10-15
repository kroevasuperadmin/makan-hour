const { sandbox, configured, call, cors } = require('./_billplz');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!configured()) return res.status(503).json({ error: 'FPX is not set up on this server yet (Billplz keys missing).' });
  const { kind, ref, amountSen, name, email, description } = req.body || {};
  const amount = Math.round(Number(amountSen));
  if (!['invoice', 'topup'].includes(kind) || !ref || !(amount >= 100 && amount <= 5000000)) return res.status(400).json({ error: 'Bad payment request' });
  const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const form = new URLSearchParams({
    collection_id: process.env.BILLPLZ_COLLECTION_ID, email: String(email || 'billing@example.com'), name: String(name || 'Makan Hour customer').slice(0, 255),
    amount: String(amount), description: String(description || `Makan Hour ${kind} ${ref}`).slice(0, 200),
    callback_url: `${host}/api/fpx/callback`, redirect_url: `${host}/?fpx=done`, reference_1_label: 'Ref', reference_1: String(ref).slice(0, 120),
  });
  try {
    const b = await call('/bills', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
    res.status(200).json({ id: b.id, url: b.url, sandbox });
  } catch (e) { res.status(502).json({ error: e.message }); }
};
