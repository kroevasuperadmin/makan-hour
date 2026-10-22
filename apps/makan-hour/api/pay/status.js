const { configured, stripe, cors } = require('./_stripe');
const orderApi = require('./_order');
module.exports = async (req, res) => {
  cors(res);
  if (!configured()) return res.status(503).json({ error: 'Payments are not set up on this server yet.' });
  const id = String(req.query.id || '');
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return res.status(400).json({ error: 'Bad session id' });
  try {
    const s = await stripe(`/checkout/sessions/${id}?expand[]=payment_intent.payment_method`);
    res.setHeader('cache-control', 'no-store');
    const pi = s.payment_intent; const pm = pi && pi.payment_method;
    const paid = s.payment_status === 'paid';
    if (paid && s.metadata && s.metadata.kind === 'order' && orderApi.sbReady() && orderApi.idOk(String(s.metadata.ref || ''))) {
      if (Math.round(Number(s.amount_total)) > 0) await orderApi.markPaid(s.metadata.ref, s.id, pi ? pi.id : null, pm ? pm.type : null);
    }
    res.status(200).json({ id: s.id, paid, state: s.status, amountSen: s.amount_total, method: pm ? pm.type : null, ref: pi ? pi.id : null });
  } catch (e) { res.status(e.status === 404 ? 404 : 502).json({ error: e.message }); }
};
