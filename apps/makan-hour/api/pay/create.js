// Creates a Stripe Checkout Session in MYR that accepts FPX and cards. Lunch is a physical good,
// so App Store guideline 3.1.3(e) applies and Apple In-App Purchase is not used.
const { configured, testMode, stripe, cors } = require('./_stripe');
module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!configured()) return res.status(503).json({ error: 'Payments are not set up on this server yet (Stripe key missing).' });
  const { kind, ref, amountSen, email, description, real } = req.body || {};
  // The key is live. Demo accounts get the mock flow so nobody pays real money for a sample invoice.
  if (!testMode() && real !== true) return res.status(403).json({ error: 'Demo accounts use the mock payment flow. Sign up an office to pay for real.', demo: true });
  const amount = Math.round(Number(amountSen));
  // Stripe FPX takes RM 2.00 to RM 30,000.00 per payment.
  if (!['invoice', 'topup'].includes(kind) || !ref || !(amount >= 200 && amount <= 3000000)) return res.status(400).json({ error: 'Bad payment request' });
  const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  try {
    const s = await stripe('/checkout/sessions', {
      mode: 'payment', payment_method_types: { 0: 'fpx', 1: 'card' }, customer_email: email || undefined,
      line_items: { 0: { quantity: 1, price_data: { currency: 'myr', unit_amount: amount, product_data: { name: String(description || `Makan Hour ${kind}`).slice(0, 200) } } } },
      client_reference_id: String(ref).slice(0, 200), metadata: { kind, ref: String(ref).slice(0, 200) },
      success_url: `${host}/?paid={CHECKOUT_SESSION_ID}`, cancel_url: `${host}/?paid=cancelled`,
    });
    res.status(200).json({ id: s.id, url: s.url, test: testMode() });
  } catch (e) { res.status(502).json({ error: e.message }); }
};
