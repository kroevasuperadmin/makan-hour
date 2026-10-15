// Called by the caterer app right after it records a delay. The server re-reads the drop from the
// database, so a caller can't push arbitrary text, and pushes at most once per recorded delay.
const { sb, sbReady, apnsReady, sendApns, cors } = require('./_lib');
const hhmm = s => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
module.exports = async (req, res) => {
  cors(res); if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!sbReady() || !apnsReady()) return res.status(503).json({ error: 'Server push not configured' });
  const officeId = String((req.body || {}).officeId || '');
  if (!/^o[1-3]$/.test(officeId)) return res.status(400).json({ error: 'Bad office' });
  try {
    const [d] = await sb(`makan_drops?session_id=eq.demo&office_id=eq.${officeId}&select=*`);
    if (!d || !d.delay_min || d.stage >= 4 || !d.delay_notified_at) return res.status(200).json({ sent: 0, why: 'no open delay' });
    if (d.delay_pushed_at === d.delay_notified_at) return res.status(200).json({ sent: 0, why: 'already pushed' });
    const tokens = await sb(`makan_push_tokens?office_id=eq.${officeId}&platform=eq.ios&select=token,role`);
    const at = hhmm(d.due_at + d.delay_min * 60);
    const results = [];
    for (const role of ['employee', 'admin']) {
      const ts = tokens.filter(t => t.role === role).map(t => t.token);
      const body = role === 'employee' ? `New time ${at}. You don't need to do anything.` : `New time ${at}. Staff have been told.`;
      results.push(...await sendApns(ts, { aps: { alert: { title: `Lunch is ${d.delay_min} min late`, body }, sound: 'default' }, officeId }));
    }
    const dead = results.filter(r => r.status === 410 || r.reason === 'BadDeviceToken').map(r => r.token);
    if (dead.length) await sb(`makan_push_tokens?token=in.(${dead.join(',')})`, { method: 'DELETE' });
    await sb(`makan_drops?session_id=eq.demo&office_id=eq.${officeId}`, { method: 'PATCH', body: JSON.stringify({ delay_pushed_at: d.delay_notified_at }) });
    res.status(200).json({ sent: results.filter(r => r.status === 200).length, failed: results.filter(r => r.status !== 200).length });
  } catch (e) { res.status(502).json({ error: e.message }); }
};
