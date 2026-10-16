// /metrics?k=METRICS_SECRET : agent work log vs a human hire. Reads agent_task_log only (no seeded rows).
const L = require('./agents/_lib');
const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const usd = n => `$${(+n).toFixed(n < 0.01 && n > 0 ? 6 : 2)}`;
module.exports = async (req, res) => {
  const k = (req.query && req.query.k) || '';
  if (!process.env.METRICS_SECRET || k !== process.env.METRICS_SECRET) { res.status(404).send('Not found'); return; }
  if (!L.sbReady()) { res.status(503).send('Server not configured'); return; }
  const rows = await L.sb('agent_task_log?select=*&order=started_at.desc&limit=5000');
  const outs = await L.sb('makan_agent_outputs?select=kind,created_at,body&order=created_at.desc&limit=40');
  const H = L.HUMAN; const n = rows.length;
  const mins = rows.reduce((a, r) => a + +r.human_minutes_equiv, 0);
  const cost = rows.reduce((a, r) => a + +r.cost_usd, 0), hcost = rows.reduce((a, r) => a + +r.human_cost_usd, 0);
  const demo = rows.filter(r => r.is_demo).length;
  const by = {}; for (const r of rows) { const b = by[r.task_type] ||= { n: 0, mins: 0, cost: 0, h: 0, dur: 0 }; b.n++; b.mins += +r.human_minutes_equiv; b.cost += +r.cost_usd; b.h += +r.human_cost_usd; b.dur += +r.duration_s; }
  const latest = {}; for (const o of outs) latest[o.kind] ||= o;
  const card = (t, v, s) => `<div class=c><div class=l>${t}</div><div class=v>${v}</div><div class=s>${s || ''}</div></div>`;
  const myt = t => new Date(t).toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour12: false });
  res.setHeader('content-type', 'text/html; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.setHeader('x-robots-tag', 'noindex');
  res.status(200).send(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Makan Hour · Agent metrics</title>
<style>body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#1b1b1b;background:#faf7f2}h1{font-size:22px}h2{font-size:16px;margin-top:28px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.c{background:#fff;border:1px solid #e6e0d6;border-radius:10px;padding:12px}.l{color:#666;font-size:12px}.v{font-size:24px;font-weight:700}.s{color:#777;font-size:12px}table{border-collapse:collapse;width:100%;background:#fff}td,th{border:1px solid #e6e0d6;padding:5px 8px;text-align:left;vertical-align:top}th{background:#f3eee6}.a{background:#fff8e1;border:1px solid #f0d98a;padding:10px;border-radius:8px}pre{white-space:pre-wrap;font-size:12px;max-height:260px;overflow:auto;background:#fff;border:1px solid #e6e0d6;padding:8px}</style>
<h1>Makan Hour · Human-Replacing AI Agents: work log</h1>
<p>Every row below is a real agent run written by the agent itself. Nothing is seeded. ${demo} of ${n} runs were on the demo session (labelled <b>demo</b>).</p>
<div class=g>${card('Tasks completed', n, `${demo} demo · ${n - demo} live`)}${card('Human hours saved', (mins / 60).toFixed(2), `${mins.toFixed(0)} min of ops work`)}${card('Agent cost', usd(cost), n ? `${usd(cost / n)} per task` : '')}${card('Same work by a hire', usd(hcost), n ? `${usd(hcost / n)} per task` : '')}${card('Saving', usd(hcost - cost), hcost ? `${(100 * (1 - cost / hcost)).toFixed(1)}% cheaper` : '')}</div>
<h2>Assumption: human cost in Malaysia</h2>
<div class=a><b>Labelled assumption.</b> Mean monthly wage RM ${H.monthlyWageMyr.toLocaleString()} (source: <a href="${H.sourceUrl}">${esc(H.source)}</a>) + ${H.onCostPct * 100}% employer on-costs (EPF 13%, SOCSO ≈1.75%, EIS 0.2%) ÷ ${H.hoursPerMonth} h/month = <b>RM ${H.hourlyMyr.toFixed(2)}/h</b> = <b>USD ${H.hourlyUsd.toFixed(2)}/h</b> at USD 1 = RM ${H.myrPerUsd}.
Minutes per task are estimates of the same task done by hand: ${Object.entries(L.HUMAN_MIN).map(([t, m]) => `${t} ${m} min`).join(', ')}.
Agent cost = real LLM token cost when an LLM is called; serverless compute is recorded as $0 (inside Vercel's free tier at this volume).</div>
<h2>By task</h2><table><tr><th>Task</th><th>Runs</th><th>Avg agent time</th><th>Human hours</th><th>Agent cost / task</th><th>Human cost / task</th></tr>
${Object.entries(by).map(([t, b]) => `<tr><td>${esc(t)}</td><td>${b.n}</td><td>${(b.dur / b.n).toFixed(2)} s</td><td>${(b.mins / 60).toFixed(2)}</td><td>${usd(b.cost / b.n)}</td><td>${usd(b.h / b.n)}</td></tr>`).join('') || '<tr><td colspan=6>No agent runs yet.</td></tr>'}</table>
<h2>Latest runs (MYT)</h2><table><tr><th>Started</th><th>Agent</th><th>Task</th><th>Time</th><th>Outcome</th><th></th></tr>
${rows.slice(0, 60).map(r => `<tr><td>${myt(r.started_at)}</td><td>${esc(r.agent)}</td><td>${esc(r.task_type)}</td><td>${(+r.duration_s).toFixed(2)} s</td><td>${esc(r.outcome)}</td><td>${r.is_demo ? 'demo' : 'live'}</td></tr>`).join('')}</table>
<h2>Latest agent outputs</h2>${Object.values(latest).map(o => `<h3>${esc(o.kind)} · ${myt(o.created_at)}</h3><pre>${esc(JSON.stringify(o.body, null, 2))}</pre>`).join('') || '<p>None yet.</p>'}`);
};
