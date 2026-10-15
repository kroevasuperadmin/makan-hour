// Billplz posts here when a bill changes. The app reads payment state from /status (which asks
// Billplz directly), so this endpoint only verifies the signature and acknowledges.
const { verify } = require('./_billplz');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const p = req.body || {};
  if (!verify(p)) return res.status(401).send('bad signature');
  console.log('billplz callback', p.id, p.paid, p.paid_at);
  res.status(200).send('OK');
};
