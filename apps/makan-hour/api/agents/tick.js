// Ops agent tick. Runs every minute from Supabase pg_cron (see supabase/makan_migration_4_cron.sql).
// On the demo session it: reminds staff who haven't ordered (in-app nudge only, from 10:00),
// locks ordering at the 10:30 cutoff, builds the consolidated caterer manifest, and confirms
// each delivery against the 12:00-12:45 window. Each action writes one agent_task_log row.
const L = require('./_lib');
const AGENT = 'ops-agent';

async function run() {
  const done = [];
  const st = await L.demoState(); const { s, clock } = st;
  // Presenter reset the demo: clear the agent's markers silently so the next run acts again.
  if (!s.cutoff_passed && (s.agent_manifest_at || s.agent_cutoff_at)) await L.sb('makan_session?id=eq.demo', { method: 'PATCH', body: JSON.stringify({ agent_manifest_at: null, agent_cutoff_at: null }) });
  for (const d of st.drops) if (d.agent_checked_stage != null && d.agent_checked_stage > d.stage) await L.sb(`makan_drops?session_id=eq.demo&office_id=eq.${d.office_id}`, { method: 'PATCH', body: JSON.stringify({ agent_checked_stage: d.stage }) });

  // 1. Order reminder (10:00-10:30): nudge everyone without an order, once.
  if (!s.cutoff_passed && clock >= 10 * 3600 && clock < L.CUTOFF && !(s.nudged || []).length) {
    const t0 = Date.now();
    const ordered = new Set(st.orders.map(o => o.employee_id));
    const all = []; let k = 0;
    for (const o of Object.keys(L.OFFICES)) { const n = o === 'o1' ? L.OFFICES[o][2] - 1 : L.OFFICES[o][2]; if (o === 'o1') all.push('me'); for (let i = 0; i < n; i++, k++) all.push(`e${k}`); }
    const ids = all.filter(id => !ordered.has(id));
    if (ids.length) {
      await L.sb('makan_session?id=eq.demo', { method: 'PATCH', body: JSON.stringify({ nudged: ids }) });
      done.push(await L.logTask({ task_type: 'order_reminder', agent: AGENT, t0, is_demo: true, outcome: `nudged ${ids.length} staff in-app at ${L.hhmm(clock)}`, detail: { ids } }));
    }
  }
  // 2. Cutoff lock at 10:30 (demo clock).
  if (!s.cutoff_passed && clock >= L.CUTOFF) {
    const t0 = Date.now();
    await L.sb('makan_session?id=eq.demo', { method: 'PATCH', body: JSON.stringify({ cutoff_passed: true, agent_cutoff_at: new Date().toISOString() }) });
    s.cutoff_passed = true;
    done.push(await L.logTask({ task_type: 'cutoff_lock', agent: AGENT, t0, is_demo: true, outcome: `ordering locked at ${L.hhmm(clock)} with ${st.orders.length} orders` }));
  }
  // 3. Consolidated caterer manifest, once per run after cutoff.
  if (s.cutoff_passed && !s.agent_manifest_at) {
    const t0 = Date.now();
    const byCat = {};
    for (const o of st.orders) {
      const [cat, name, price] = L.DISHES[o.dish_id] || []; if (!cat) continue;
      const c = byCat[cat] ||= { caterer: L.CATERERS[cat], offices: {}, meals: 0, grossSen: 0 };
      const off = c.offices[o.office_id] ||= { office: L.OFFICES[o.office_id][0], dropSpot: L.OFFICES[o.office_id][1], dishes: {}, meals: 0 };
      off.dishes[name] = (off.dishes[name] || 0) + 1; off.meals++; c.meals++; c.grossSen += price;
    }
    const perOffice = {}; for (const o of st.orders) perOffice[o.office_id] = (perOffice[o.office_id] || 0) + 1;
    const belowMin = Object.entries(perOffice).filter(([, n]) => n < L.MIN_MEALS).map(([o, n]) => ({ office: L.OFFICES[o][0], meals: n }));
    for (const c of Object.values(byCat)) { c.commissionSen = Math.round(c.grossSen * L.COMMISSION); c.payoutSen = c.grossSen - c.commissionSen; }
    const manifest = { generatedAtDemoClock: L.hhmm(clock), totalMeals: st.orders.length, perOffice, belowMinimum: belowMin, caterers: byCat, serviceFeeSen: st.orders.length * L.SERVICE_FEE_SEN };
    await L.output('caterer_manifest', manifest);
    await L.sb('makan_session?id=eq.demo', { method: 'PATCH', body: JSON.stringify({ agent_manifest_at: new Date().toISOString() }) });
    done.push(await L.logTask({ task_type: 'caterer_consolidation', agent: AGENT, t0, is_demo: true, outcome: `manifest: ${st.orders.length} meals, ${Object.keys(byCat).length} caterers, ${belowMin.length} drops under min ${L.MIN_MEALS}` }));
  }
  // 4. Delivery confirmation per drop.
  for (const d of st.drops) {
    if (d.stage === 4 && d.agent_checked_stage !== 4) {
      const t0 = Date.now();
      const at = d.delivered_at, promised = d.due_at + d.delay_min * 60;
      const inWindow = at >= 12 * 3600 && at <= 12 * 3600 + 45 * 60;
      const body = { office: L.OFFICES[d.office_id][0], rider: d.rider, deliveredAt: L.hhmm(at), promised: L.hhmm(promised), delayMin: d.delay_min, inWindow, refundEligible: !inWindow || d.delay_min > 30 };
      await L.output('delivery_check', body);
      await L.sb(`makan_drops?session_id=eq.demo&office_id=eq.${d.office_id}`, { method: 'PATCH', body: JSON.stringify({ agent_checked_stage: 4 }) });
      done.push(await L.logTask({ task_type: 'delivery_confirmation', agent: AGENT, t0, is_demo: true, outcome: `${d.office_id} delivered ${L.hhmm(at)} ${inWindow ? 'in' : 'OUTSIDE'} 12:00-12:45 window`, detail: body }));
    }
  }
  return done;
}
module.exports = async (req, res) => {
  if (!L.authorized(req)) return L.json(res, 401, { error: 'unauthorized' });
  if (!L.sbReady()) return L.json(res, 503, { error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set' });
  try { const done = await run(); L.json(res, 200, { actions: done.length, done }); } catch (e) { L.json(res, 502, { error: e.message }); }
};
module.exports.run = run;
