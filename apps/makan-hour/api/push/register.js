const { sb, sbReady, cors } = require('./_lib');
module.exports = async (req, res) => {
  cors(res); if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!sbReady()) return res.status(503).json({ error: 'Push storage not configured' });
  const { token, platform, role, employeeId, officeId } = req.body || {};
  if (!/^[0-9a-f]{32,200}$/i.test(String(token)) || !['ios', 'android'].includes(platform) || !['employee', 'admin'].includes(role)) return res.status(400).json({ error: 'Bad token' });
  // Demo accounts only: one office, known ids.
  if (officeId !== 'o1' || !/^(me|admin)$/.test(String(employeeId))) return res.status(400).json({ error: 'Unknown account' });
  try {
    await sb('makan_push_tokens', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ token, platform, role, employee_id: employeeId, office_id: officeId, updated_at: new Date().toISOString() }) });
    res.status(200).json({ ok: true });
  } catch (e) { res.status(502).json({ error: e.message }); }
};
