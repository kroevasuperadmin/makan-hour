// Support agent. POST { question } answers an employee / office admin / caterer question with an LLM
// grounded in the Makan Hour rules below. POST { refund: { officeId, reason } } decides a refund
// request from the delivery record (rule-based, no LLM needed).
// Q&A is behind a flag: SUPPORT_AGENT_ON=1 and XAI_API_KEY (or OPENAI_API_KEY) in Vercel env.
// Refunds are decided, logged and credited in the demo only; no real Stripe refund is ever issued here.
const L = require('./_lib');
const AGENT = 'support-agent';
const RULES = `You are the Makan Hour support agent. Makan Hour is an office lunch pre-order service in Kuala Lumpur.
Facts (answer only from these; if unsure, say a human will follow up):
- Order by 10:30am each working day in the app; after 10:30 orders are locked and cannot be changed or cancelled.
- Delivery window 12:00 to 12:45 to the office drop spot. Riders are tracked in the app; delays are pushed to staff.
- Meals cost RM12 to RM18. The company covers a daily allowance (RM15 in the demo); anything above it is a staff top-up paid by FPX or card.
- The office pays a RM2 service fee per meal, delivery included. Caterers pay 15% commission.
- Minimum 10 meals per office drop.
- Refunds: if lunch arrives outside 12:00-12:45, more than 30 minutes late, or not at all, the meal is credited.
- Payments by FPX or card through Stripe. Invoices are monthly, due 14 days after issue.
Keep answers under 80 words, friendly, plain English.`;
// Token prices (USD per 1M tokens) used to record real LLM cost per answer. Labelled assumption; update if pricing changes.
const PRICE = { xai: { model: 'grok-3-mini', in: 0.30, out: 0.50, url: 'https://api.x.ai/v1/chat/completions', key: 'XAI_API_KEY' },
  openai: { model: 'gpt-4o-mini', in: 0.15, out: 0.60, url: 'https://api.openai.com/v1/chat/completions', key: 'OPENAI_API_KEY' } };
const provider = () => (process.env.XAI_API_KEY ? PRICE.xai : process.env.OPENAI_API_KEY ? PRICE.openai : null);
function status() {
  const p = provider();
  if (process.env.SUPPORT_AGENT_ON !== '1') return { on: false, reason: 'SUPPORT_AGENT_ON is not 1' };
  if (!p) return { on: false, reason: 'no LLM API key (XAI_API_KEY or OPENAI_API_KEY) in server env' };
  return { on: true, model: p.model };
}
async function answer(q) {
  const p = provider(); const t0 = Date.now();
  const r = await fetch(p.url, { method: 'POST', headers: { authorization: `Bearer ${process.env[p.key]}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: p.model, max_tokens: 200, messages: [{ role: 'system', content: RULES }, { role: 'user', content: q }] }) });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && (j.error.message || j.error)) || `LLM ${r.status}`);
  const u = j.usage || {}; const cost = ((u.prompt_tokens || 0) * p.in + (u.completion_tokens || 0) * p.out) / 1e6;
  const text = j.choices[0].message.content;
  await L.output('support_answer', { q, a: text, model: p.model, usage: u });
  await L.logTask({ task_type: 'support_answer', agent: AGENT, t0, is_demo: true, cost_usd: +cost.toFixed(6), outcome: `answered (${p.model}, ${u.total_tokens || '?'} tokens)` });
  return text;
}
async function refund(officeId, reason) {
  const t0 = Date.now();
  const [d] = await L.sb(`makan_drops?session_id=eq.demo&office_id=eq.${officeId}&select=*`);
  if (!d) throw new Error('unknown office');
  const st = await L.demoState();
  const promised = d.due_at + d.delay_min * 60;
  let eligible = false, why;
  if (d.stage === 4) { const inWin = d.delivered_at >= 12 * 3600 && d.delivered_at <= 12 * 3600 + 45 * 60; eligible = !inWin || d.delay_min > 30; why = eligible ? `delivered ${L.hhmm(d.delivered_at)}, outside policy` : `delivered ${L.hhmm(d.delivered_at)}, within 12:00-12:45`; }
  else if (st.clock > 13 * 3600 + 15 * 60) { eligible = true; why = 'not delivered by 1:15 pm'; }
  else why = `drop still in progress (promised ${L.hhmm(promised)}); ask again if it misses the window`;
  const decision = { officeId, reason: String(reason || '').slice(0, 300), eligible, why, execution: eligible ? 'demo credit recorded (mock, no money moved)' : 'none' };
  await L.output('refund_decision', decision);
  await L.logTask({ task_type: 'refund_decision', agent: AGENT, t0, is_demo: true, outcome: `${eligible ? 'approved' : 'declined'}: ${why}` });
  return decision;
}
module.exports = async (req, res) => {
  res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return L.json(res, 200, status());
  if (req.method !== 'POST') return L.json(res, 405, { error: 'POST only' });
  if (!L.sbReady()) return L.json(res, 503, { error: 'server not configured' });
  const b = req.body || {};
  try {
    if (b.refund) { if (!/^o[1-3]$/.test(String(b.refund.officeId))) return L.json(res, 400, { error: 'bad office' }); return L.json(res, 200, await refund(b.refund.officeId, b.refund.reason)); }
    const q = String(b.question || '').trim().slice(0, 500); if (!q) return L.json(res, 400, { error: 'question required' });
    const s = status(); if (!s.on) return L.json(res, 503, { error: 'Support agent is off', blocked: s.reason });
    L.json(res, 200, { answer: await answer(q) });
  } catch (e) { L.json(res, 502, { error: e.message }); }
};
