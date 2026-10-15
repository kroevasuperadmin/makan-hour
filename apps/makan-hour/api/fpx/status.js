const { configured, call, cors } = require('./_billplz');
module.exports = async (req, res) => {
  cors(res);
  if (!configured()) return res.status(503).json({ error: 'FPX is not set up on this server yet.' });
  const id = String(req.query.id || '');
  if (!/^[a-z0-9]{4,32}$/i.test(id)) return res.status(400).json({ error: 'Bad bill id' });
  try {
    const b = await call(`/bills/${id}`);
    res.setHeader('cache-control', 'no-store');
    res.status(200).json({ id: b.id, paid: Boolean(b.paid), state: b.state, paidAt: b.paid_at || null, amountSen: b.amount });
  } catch (e) { res.status(e.status === 404 ? 404 : 502).json({ error: e.message }); }
};
