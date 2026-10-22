// Stripe webhook. The app reads payment state from /status (which asks Stripe directly), so this
// endpoint verifies the signature and logs. Point a Stripe webhook at /api/pay/webhook for
// checkout.session.completed and checkout.session.async_payment_succeeded / _failed.
const { verifySig } = require('./_stripe');
const orderApi = require('./_order');
const raw = req => new Promise((ok, no) => { let d = ''; req.setEncoding('utf8'); req.on('data', c => { d += c; }); req.on('end', () => ok(d)); req.on('error', no); });
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const body = await raw(req);
  if (!verifySig(body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return res.status(400).send('bad signature');
  const ev = JSON.parse(body); const o = (ev.data && ev.data.object) || {};
  console.log('stripe', ev.type, o.id, o.payment_status);
  const done = ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded';
  if (done && o.payment_status === 'paid' && o.metadata && o.metadata.kind === 'order' && orderApi.idOk(String(o.metadata.ref || ''))) {
    if (!orderApi.sbReady()) return res.status(503).json({ error: 'database key missing' });
    try { await orderApi.markPaid(o.metadata.ref, o.id, o.payment_intent || null, null); }
    catch (e) { return res.status(500).json({ error: e.message }); }
  }
  res.status(200).json({ received: true });
};
