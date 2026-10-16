// Finance + reporting agent. Vercel cron, once a day at 14:00 MYT (06:00 UTC), after lunch drops.
// 1. Payment reconciliation: demo invoice state vs payment refs; live Stripe checkout sessions of the
//    last 24 h are read (GET only, nothing is charged or refunded) and matched by metadata.
// 2. Failed-payment follow-up: writes reminder drafts for unpaid / expired items. It never sends them.
// 3. Daily report: meals, revenue split, delivery punctuality, agent work and hours saved.
const L = require('./_lib');
const AGENT = 'finance-agent';
async function stripeGet(path) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
  const j = await r.json(); if (!r.ok) throw new Error((j.error && j.error.message) || `Stripe ${r.status}`); return j;
}
async function run() {
  const done = []; const st = await L.demoState(); const { s } = st;
  // 1. Reconciliation
  let t0 = Date.now();
  const demo = { invoice: 'MH-INV-2026-10-0012', status: s.invoice_status, ref: s.invoice_paid_ref, via: s.invoice_paid_via, verdict: 'unpaid' };
  if (s.invoice_status === 'paid') demo.verdict = String(s.invoice_paid_ref || '').startsWith('cs_') ? 'paid (Stripe ref, verify below)' : 'paid via mock flow (demo, no money moved)';
  let live = { checked: false };
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      if (String(s.invoice_paid_ref || '').startsWith('cs_')) { const cs = await stripeGet(`/checkout/sessions/${encodeURIComponent(s.invoice_paid_ref)}`); demo.verdict = cs.payment_status === 'paid' ? 'paid, matched in Stripe' : `MISMATCH: Stripe says ${cs.payment_status}`; }
      const since = Math.floor(Date.now() / 1000) - 86400;
      const list = await stripeGet(`/checkout/sessions?limit=100&created[gte]=${since}`);
      const mine = list.data.filter(x => x.metadata && ['invoice', 'topup'].includes(x.metadata.kind));
      live = { checked: true, sessions: mine.length, paid: mine.filter(x => x.payment_status === 'paid').length, unpaidOpen: mine.filter(x => x.status === 'open').length, expired: mine.filter(x => x.status === 'expired').map(x => ({ id: x.id, kind: x.metadata.kind, ref: x.metadata.ref, amountSen: x.amount_total })) };
    } catch (e) { live = { checked: false, error: e.message }; }
  }
  await L.output('reconciliation', { demo, live });
  done.push(await L.logTask({ task_type: 'payment_reconciliation', agent: AGENT, t0, is_demo: true, outcome: `demo invoice ${demo.verdict}; live Stripe ${live.checked ? `${live.sessions} sessions, ${live.paid} paid` : 'not checked'}` }));

  // 2. Failed / unpaid payment follow-up drafts (never sent)
  t0 = Date.now();
  const drafts = [];
  if (s.invoice_status !== 'paid') drafts.push({ to: 'Finance, Contoh Capital Sdn Bhd (demo office)', subject: 'Makan Hour invoice MH-INV-2026-10-0012', body: 'Hi, a reminder that invoice MH-INV-2026-10-0012 (October 2026) is open, due 14 Nov 2026. You can pay by FPX or card from the Admin app under Billing. Thank you.' });
  for (const x of (live.expired || [])) drafts.push({ to: `payer of ${x.kind} ${x.ref}`, subject: 'Your Makan Hour payment did not go through', body: `Your ${x.kind} payment of ${L.rm(x.amountSen || 0)} expired before it completed. Open the app and tap Pay again; FPX and cards are accepted.` });
  if (drafts.length) {
    await L.output('payment_followup', { status: 'drafted, not sent (sending to real people needs Faris)', drafts });
    done.push(await L.logTask({ task_type: 'failed_payment_followup', agent: AGENT, t0, is_demo: true, outcome: `${drafts.length} reminder draft(s) written, not sent` }));
  }

  // 3. Daily report
  t0 = Date.now();
  const perOffice = {}; let gross = 0;
  for (const o of st.orders) { perOffice[o.office_id] = (perOffice[o.office_id] || 0) + 1; gross += (L.DISHES[o.dish_id] || [0, 0, 0])[2]; }
  const meals = st.orders.length;
  const since = new Date(Date.now() - 86400000).toISOString();
  const tasks = await L.sb(`agent_task_log?started_at=gte.${since}&select=task_type,human_minutes_equiv,cost_usd,human_cost_usd`);
  const report = {
    date: new Date().toLocaleDateString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' }), session: 'demo',
    meals, perOffice, belowMinimum: Object.entries(perOffice).filter(([, n]) => n < L.MIN_MEALS).map(([o]) => o),
    foodGrossSen: gross, catererCommissionSen: Math.round(gross * L.COMMISSION), officeServiceFeeSen: meals * L.SERVICE_FEE_SEN,
    makanRevenueSen: Math.round(gross * L.COMMISSION) + meals * L.SERVICE_FEE_SEN,
    cutoffLocked: s.cutoff_passed, batchConfirmedByCaterer: s.batch_confirmed,
    drops: st.drops.map(d => ({ office: d.office_id, stage: d.stage, delivered: d.delivered_at ? L.hhmm(d.delivered_at) : null, delayMin: d.delay_min })),
    invoice: demo.verdict,
    agentTasks24h: tasks.length, humanHoursSaved24h: +(tasks.reduce((a, t) => a + +t.human_minutes_equiv, 0) / 60).toFixed(2),
  };
  await L.output('daily_report', report);
  done.push(await L.logTask({ task_type: 'daily_report', agent: AGENT, t0, is_demo: true, outcome: `report: ${meals} meals, revenue ${L.rm(report.makanRevenueSen)}, ${tasks.length} agent tasks in 24h` }));
  return done;
}
module.exports = async (req, res) => {
  if (!L.authorized(req)) return L.json(res, 401, { error: 'unauthorized' });
  if (!L.sbReady()) return L.json(res, 503, { error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set' });
  try { const done = await run(); L.json(res, 200, { actions: done.length, done }); } catch (e) { L.json(res, 502, { error: e.message }); }
};
