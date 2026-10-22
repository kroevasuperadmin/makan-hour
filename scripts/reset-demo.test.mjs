import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { DEMO_START, seedDrops } from '../packages/core/src/seed.ts';
import {
  DEMO_PROJECT_REF, clockLabel, dropPatch, keyIsUsable, projectIsDemo, readDemoEnv, redact, runReset, sessionPatch,
} from './reset-demo.mjs';

const DEMO_URL = `https://${DEMO_PROJECT_REF}.supabase.co`;
const KEY = 'test-anon-key-value-not-a-secret';

test('the clock label matches the seeded 9:18 start', () => {
  assert.equal(DEMO_START, 9 * 3600 + 18 * 60);
  assert.equal(clockLabel(DEMO_START), '9:18 am');
});

test('only the exact demo host is accepted', () => {
  assert.equal(projectIsDemo(DEMO_URL), true);
  assert.equal(projectIsDemo(`${DEMO_URL}/`), true);
  assert.equal(projectIsDemo('https://otherproject.supabase.co'), false);
  assert.equal(projectIsDemo('http://rlfllmhcjqhgeoikjbha.supabase.co'), false);
  assert.equal(projectIsDemo(`${DEMO_URL}/rest/v1/`), false);
  assert.equal(projectIsDemo(`https://user:${KEY}@${DEMO_PROJECT_REF}.supabase.co`), false);
  assert.equal(projectIsDemo(''), false);
  assert.equal(projectIsDemo('not a url'), false);
});

function fakeJwt(role) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${enc({ alg: 'none' })}.${enc({ role })}.sig`;
}

test('placeholder keys and the service role are refused', () => {
  assert.equal(keyIsUsable(KEY), true);
  assert.equal(keyIsUsable(fakeJwt('anon')), true);
  assert.equal(keyIsUsable(fakeJwt('service_role')), false);
  assert.equal(keyIsUsable('short'), false);
  assert.equal(keyIsUsable('<anon key from Supabase > Project settings > API>'), false);
  assert.equal(keyIsUsable('PUT_EMAIL_HERE_but_this_is_a_key'), false);
  assert.equal(redact(`Bearer ${KEY}.extra.stuff eyJaaa.bbb.ccc`).includes(KEY), false);
});

test('env reading keeps only the two public names', () => {
  const parsed = readDemoEnv(`
# comment
SUPABASE_SERVICE_ROLE_KEY=super-secret-value-should-not-load
EXPO_PUBLIC_SUPABASE_URL="${DEMO_URL}"
export EXPO_PUBLIC_SUPABASE_ANON_KEY='${KEY}'
`);
  assert.deepEqual(parsed, { EXPO_PUBLIC_SUPABASE_URL: DEMO_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY });
});

test('session and drop patches follow the app seed', () => {
  const row = { id: 'demo', topups_allowed: false, topup_paid_ref: 'x', agent_cutoff_at: 't', agent_manifest_at: 't', agent_report_at: 't' };
  const patch = sessionPatch(row, '2026-10-22T00:00:00.000Z');
  assert.equal(patch.clock_base, DEMO_START);
  assert.equal(patch.cutoff_passed, false);
  assert.equal(patch.invoice_status, 'unpaid');
  assert.equal(patch.topups_allowed, true);
  assert.equal(patch.topup_paid_ref, null);
  assert.equal(patch.agent_cutoff_at, null);
  assert.equal(patch.agent_report_at, null);
  const bare = sessionPatch({ id: 'demo' }, '2026-10-22T00:00:00.000Z');
  assert.equal('topups_allowed' in bare, false);
  assert.equal('agent_cutoff_at' in bare, false);

  const [first] = seedDrops();
  const drop = dropPatch(first, { delay_pushed_at: 1, agent_checked_stage: 4 });
  assert.equal(drop.stage, 0);
  assert.equal(drop.due_at, first.dueAt);
  assert.equal(drop.rider, first.rider);
  assert.equal(drop.delay_pushed_at, null);
  assert.equal(drop.agent_checked_stage, null);
});

function fakeFetch(handlers) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : undefined, headers: init.headers });
    const hit = handlers.find(h => url.includes(h.match) && (init.method || 'GET') === h.method);
    if (!hit) return { ok: false, status: 500, text: async () => 'unexpected ' + url };
    return { ok: true, status: 200, text: async () => JSON.stringify(hit.body) };
  };
  return { calls, fetchImpl };
}

const sessionRow = {
  id: 'demo', cutoff_passed: true, topups_allowed: false, topup_paid_ref: 'paid',
  agent_cutoff_at: 't', agent_manifest_at: 't', agent_report_at: 't',
};
const dropRows = seedDrops().map(d => ({
  session_id: 'demo', office_id: d.officeId, delay_pushed_at: 12, agent_checked_stage: 4,
}));

test('a placeholder key on the demo host never calls the network', async () => {
  let called = false;
  await assert.rejects(
    () => runReset({ url: DEMO_URL, key: '<anon key from Supabase > Project settings > API>', fetchImpl: async () => { called = true; } }),
    /placeholder/,
  );
  assert.equal(called, false);
});

test('a non-demo project never calls the network', async () => {
  let called = false;
  await assert.rejects(
    () => runReset({ url: 'https://otherproject.supabase.co', key: KEY, fetchImpl: async () => { called = true; } }),
    /demo project/,
  );
  assert.equal(called, false);
});

test('a missing demo session writes nothing', async () => {
  const { calls, fetchImpl } = fakeFetch([
    { method: 'GET', match: 'makan_session', body: [] },
  ]);
  await assert.rejects(() => runReset({ url: DEMO_URL, key: KEY, fetchImpl }), /session row was not there/);
  assert.equal(calls.length, 1);
  assert.equal(calls.some(c => c.method !== 'GET'), false);
});

test('reset sends the seed writes and does not leak the key into the log line', async () => {
  const { calls, fetchImpl } = fakeFetch([
    { method: 'GET', match: 'makan_session', body: [sessionRow] },
    { method: 'GET', match: 'makan_drops', body: dropRows },
    { method: 'DELETE', match: 'makan_orders', body: [] },
    { method: 'DELETE', match: 'makan_profiles', body: [] },
    { method: 'PATCH', match: 'makan_session', body: [{ id: 'demo' }] },
    ...seedDrops().map(d => ({ method: 'PATCH', match: `office_id=eq.${d.officeId}`, body: [{ office_id: d.officeId }] })),
  ]);
  const line = await runReset({ url: DEMO_URL, key: KEY, fetchImpl, now: () => new Date('2026-10-22T01:00:00.000Z') });
  assert.match(line, /9:18 am/);
  assert.equal(line.includes(KEY), false);
  const methods = calls.map(c => `${c.method} ${c.url.split('/rest/v1/')[1].split('?')[0]}`);
  assert.deepEqual(methods, [
    'GET makan_session', 'GET makan_drops', 'DELETE makan_orders', 'DELETE makan_profiles', 'PATCH makan_session',
    'PATCH makan_drops', 'PATCH makan_drops', 'PATCH makan_drops',
  ]);
  for (const c of calls) {
    assert.equal(c.headers.apikey, KEY);
    assert.equal(c.url.includes(KEY), false);
  }
  const sessionWrite = calls.find(c => c.method === 'PATCH' && c.url.includes('makan_session'));
  assert.equal(sessionWrite.body.clock_base, DEMO_START);
  assert.equal(sessionWrite.body.cutoff_passed, false);
  assert.equal(sessionWrite.body.nudged.length, 0);
  assert.equal(sessionWrite.body.topups_allowed, true);
  assert.equal(sessionWrite.body.agent_manifest_at, null);
  const dropWrite = calls.find(c => c.method === 'PATCH' && c.url.includes('office_id=eq.o1'));
  assert.equal(dropWrite.body.stage, 0);
  assert.equal(dropWrite.body.rider, 'Rider 07 · Faiz');
  assert.equal(dropWrite.body.delay_pushed_at, null);
});

test('the command refuses a different project without calling it', () => {
  const result = spawnSync(process.execPath, ['scripts/reset-demo.mjs', '--yes'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      EXPO_PUBLIC_SUPABASE_URL: 'https://otherproject.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: KEY,
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /demo project/);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.includes(KEY), false);
});

test('the command refuses without --yes and does not need a database', () => {
  const result = spawnSync(process.execPath, ['scripts/reset-demo.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', env: { PATH: process.env.PATH },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--yes/);
  assert.match(result.stderr, /Nothing was changed/);
  assert.equal(result.stdout.includes(KEY), false);
});
