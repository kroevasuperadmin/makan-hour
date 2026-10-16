// Shared helpers for the Makan Hour agents (server-side, Vercel functions).
// Env (Vercel only, never in git): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, METRICS_SECRET,
// optional STRIPE_SECRET_KEY (read-only reconciliation), SUPPORT_AGENT_ON + XAI_API_KEY or OPENAI_API_KEY.
const { sb, sbReady } = require('../push/_lib');

// ── Human-cost assumption (labelled; shown on /metrics) ──────────────────────────────────────────
// DOSM Salaries & Wages Survey Report 2024: mean monthly salaries & wages, Malaysian citizens = RM 3,652.
// https://www.dosm.gov.my/portal-main/release-content/salaries-and-wages-survey-report-2024
// + employer statutory on-costs ≈ 15% (EPF 13% for wages ≤ RM5,000, SOCSO ≈ 1.75%, EIS 0.2%)
// ÷ 173.33 working hours/month (40 h × 52 wk ÷ 12). FX assumption: USD 1 = RM 4.25.
const HUMAN = {
  monthlyWageMyr: 3652, onCostPct: 0.15, hoursPerMonth: 173.33, myrPerUsd: 4.25,
  source: 'DOSM Salaries & Wages Survey Report 2024 (mean monthly wage, Malaysian citizens, RM 3,652)',
  sourceUrl: 'https://www.dosm.gov.my/portal-main/release-content/salaries-and-wages-survey-report-2024',
};
HUMAN.hourlyMyr = (HUMAN.monthlyWageMyr * (1 + HUMAN.onCostPct)) / HUMAN.hoursPerMonth;
HUMAN.hourlyUsd = HUMAN.hourlyMyr / HUMAN.myrPerUsd;

// Minutes an ops person would spend doing each task by hand (labelled estimates, shown on /metrics).
const HUMAN_MIN = {
  order_reminder: 5,       // chase staff who have not ordered by 10:00
  cutoff_lock: 5,          // watch the clock, lock ordering, tell people
  caterer_consolidation: 20, // tally dishes per office, check min-10 rule, write the caterer sheet
  delivery_confirmation: 5,  // call/WhatsApp the rider, confirm drop, note lateness
  payment_reconciliation: 15, // match Stripe payments to invoices
  failed_payment_followup: 10, // find unpaid/failed items, write a reminder
  support_answer: 5,       // answer one employee question
  refund_decision: 10,     // check delivery record and refund policy, decide
  daily_report: 20,        // compile the day's numbers
};

// Vercel Hobby functions: compute cost per run is effectively zero at this volume (within free tier).
// We record the marginal infra cost as 0 and add real LLM token cost when an LLM call is made.
async function logTask({ task_type, agent, t0, outcome, is_demo, detail, cost_usd = 0 }) {
  const mins = HUMAN_MIN[task_type] || 0;
  const row = {
    task_type, agent, started_at: new Date(t0).toISOString(), duration_s: ((Date.now() - t0) / 1000).toFixed(3),
    human_minutes_equiv: mins, cost_usd, human_cost_usd: +(mins / 60 * HUMAN.hourlyUsd).toFixed(4),
    outcome, is_demo: !!is_demo, detail: detail || null,
  };
  await sb('agent_task_log', { method: 'POST', body: JSON.stringify(row), headers: { prefer: 'return=minimal' } });
  return row;
}
async function output(kind, body, is_demo = true) {
  await sb('makan_agent_outputs', { method: 'POST', body: JSON.stringify({ kind, body, is_demo }), headers: { prefer: 'return=minimal' } });
}
// Cron calls carry Authorization: Bearer CRON_SECRET (Vercel cron and the Supabase pg_cron job both send it).
function authorized(req) {
  const s = process.env.CRON_SECRET; if (!s) return false;
  const h = req.headers.authorization || '';
  return h === `Bearer ${s}`;
}

// ── Demo data, mirrored from packages/core/src/seed.ts (keep in sync) ───────────────────────────
const DISHES = { d1: ['c1', 'Nasi Ayam Hainan', 1390], d2: ['c1', 'Nasi Lemak Ayam Berempah', 1450], d3: ['c2', 'Mee Goreng Mamak', 1200], d4: ['c2', 'Vegetable Briyani Set', 1250], d5: ['c1', 'Nasi Kandar Ayam Madu', 1790] };
const CATERERS = { c1: 'Dapur Contoh Catering', c2: 'Rasa Sampel Kitchen' };
const OFFICES = { o1: ['Contoh Capital Sdn Bhd', 'Level 12 pantry', 34], o2: ['Sampel Systems Berhad', 'Level 8 reception', 26], o3: ['Dummy Dynamics Sdn Bhd', 'Level 5 lobby', 18] };
const CUTOFF = 10 * 3600 + 30 * 60, SERVICE_FEE_SEN = 200, COMMISSION = 0.15, MIN_MEALS = 10;
function seedOrders() {
  const mix = { o1: ['d1','d1','d2','d3','d1','d2','d4','d1','d3','d2'], o2: ['d3','d1','d3','d4','d2','d3','d1'], o3: ['d2','d1','d4','d3','d2'] };
  const skip = { o1: 6, o2: 4, o3: 2 }; const out = []; let k = 0;
  for (const o of Object.keys(OFFICES)) {
    const n = o === 'o1' ? OFFICES[o][2] - 1 : OFFICES[o][2]; const staff = [];
    for (let i = 0; i < n; i++, k++) staff.push(`e${k}`);
    staff.slice(0, staff.length - skip[o]).forEach((e, i) => out.push({ employee_id: e, office_id: o, dish_id: mix[o][i % mix[o].length] }));
  }
  return out;
}
async function demoState() {
  const [[s], orders, drops] = await Promise.all([
    sb('makan_session?id=eq.demo&select=*'), sb('makan_orders?session_id=eq.demo&select=*'), sb('makan_drops?session_id=eq.demo&select=*&order=office_id'),
  ]);
  const clock = s.clock_base + Math.floor((Date.now() - Date.parse(s.clock_started_at)) / 1000);
  return { s, clock, orders: [...seedOrders(), ...orders], drops };
}
const hhmm = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
const rm = sen => `RM ${(sen / 100).toFixed(2)}`;
function json(res, code, o) { res.setHeader('content-type', 'application/json'); res.status(code).end(JSON.stringify(o)); }

module.exports = { sb, sbReady, HUMAN, HUMAN_MIN, logTask, output, authorized, DISHES, CATERERS, OFFICES, CUTOFF, SERVICE_FEE_SEN, COMMISSION, MIN_MEALS, demoState, hhmm, rm, json };
