// Resets the shared 3-phone demo (session id "demo") the same way the admin
// phone does in resetLive() (packages/core/src/live.ts): clear the live order
// and desk, put the session and the three drops back to the seed in
// packages/core/src/seed.ts. When later columns are present (top-ups, agent
// markers, delay push), those are cleared too so an earlier run does not leak
// into the next demo.
//
// Refuses to run without --yes. Refuses unless the Supabase URL is the demo
// project. Never prints the key.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { DEMO_START, seedDrops } from '../packages/core/src/seed.ts';

export const DEMO_PROJECT_REF = 'rlfllmhcjqhgeoikjbha';
const DEMO_HOST = `${DEMO_PROJECT_REF}.supabase.co`;

export class Refused extends Error {
  constructor(message, changed = false) {
    super(message);
    this.changed = changed;
  }
}

export function redact(text) {
  return String(text)
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted]');
}

export function projectIsDemo(raw) {
  if (!raw || typeof raw !== 'string') return false;
  let url;
  try { url = new URL(raw.trim()); } catch { return false; }
  if (url.protocol !== 'https:') return false;
  if (url.port) return false;
  if (url.username || url.password) return false;
  if (url.search || url.hash) return false;
  if (url.pathname !== '/' && url.pathname !== '') return false;
  return url.hostname.toLowerCase() === DEMO_HOST;
}

function jwtRole(key) {
  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof json.role === 'string' ? json.role : null;
  } catch { return null; }
}

export function keyIsUsable(key) {
  if (!key || typeof key !== 'string') return false;
  const v = key.trim();
  if (v.length < 20) return false;
  if (/[<>]/.test(v)) return false;
  if (/put_|placeholder|anon key|your-anon/i.test(v)) return false;
  // The app reset uses the anon key. A service-role key must not be used here.
  if (jwtRole(v) === 'service_role') return false;
  return true;
}

// Pulls only the two public app settings out of an env file. Ignores every other name.
export function readDemoEnv(text) {
  const out = {};
  for (const line of String(text).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    let name = trimmed.slice(0, eq).trim();
    if (name.startsWith('export ')) name = name.slice(7).trim();
    if (name !== 'EXPO_PUBLIC_SUPABASE_URL' && name !== 'EXPO_PUBLIC_SUPABASE_ANON_KEY') continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[name] = value;
  }
  return out;
}

export function clockLabel(sec) {
  const h = Math.floor(sec / 3600) % 24;
  const m = Math.floor((sec % 3600) / 60);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function sessionPatch(row, nowIso, clockBase = DEMO_START) {
  const patch = {
    cutoff_passed: false,
    batch_confirmed: false,
    clock_base: clockBase,
    clock_started_at: nowIso,
    nudged: [],
    invoice_status: 'unpaid',
    invoice_paid_ref: null,
    invoice_paid_via: null,
  };
  if ('topups_allowed' in row) {
    patch.topups_allowed = true;
    patch.topup_paid_ref = null;
  }
  for (const col of ['agent_cutoff_at', 'agent_manifest_at', 'agent_report_at']) {
    if (col in row) patch[col] = null;
  }
  return patch;
}

export function dropPatch(drop, sample) {
  const patch = {
    caterer_id: drop.catererId,
    stage: drop.stage,
    due_at: drop.dueAt,
    delay_min: drop.delayMin,
    delay_notified_at: drop.delayNotifiedAt,
    delivered_at: drop.deliveredAt,
    rider: drop.rider,
  };
  if (sample && 'delay_pushed_at' in sample) patch.delay_pushed_at = null;
  if (sample && 'agent_checked_stage' in sample) patch.agent_checked_stage = null;
  return patch;
}

async function api(fetchImpl, base, key, path, { method = 'GET', body, changed = false } = {}) {
  const writing = method !== 'GET';
  let response;
  try {
    response = await fetchImpl(`${base}/rest/v1/${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: 'application/json',
        ...(writing ? { prefer: 'return=representation' } : {}),
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    throw new Refused(`Could not reach the demo project (${redact(e instanceof Error ? e.message : 'network error')}).`, changed);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Refused(`The demo project answered ${response.status}. ${redact(text).slice(0, 180)}`, changed);
  }
  if (!text) return [];
  try { return JSON.parse(text); } catch {
    throw new Refused('The demo project sent a response this script could not read.', changed);
  }
}

export async function runReset({ url, key, fetchImpl, now = () => new Date() }) {
  if (!projectIsDemo(url)) {
    throw new Refused(`Refusing to run. This reset only touches the Makan Hour demo project (${DEMO_HOST}).`);
  }
  if (!keyIsUsable(key)) {
    throw new Refused('The anon key is missing or still a placeholder. Put it in apps/makan-hour/.env. This script does not print it.');
  }
  const base = new URL(url.trim()).origin;
  const sessionRows = await api(fetchImpl, base, key, 'makan_session?id=eq.demo&select=*');
  if (!Array.isArray(sessionRows) || sessionRows.length !== 1 || sessionRows[0].id !== 'demo') {
    throw new Refused('The demo session row was not there. Nothing was written.');
  }
  const seeded = seedDrops();
  const dropRows = await api(fetchImpl, base, key, 'makan_drops?session_id=eq.demo&select=*');
  if (!Array.isArray(dropRows)) throw new Refused('The demo drops could not be read. Nothing was written.');
  const have = new Set(dropRows.map(d => d.office_id));
  for (const d of seeded) {
    if (!have.has(d.officeId)) throw new Refused(`The demo drop for ${d.officeId} is missing. Nothing was written.`);
  }

  const sample = dropRows[0] || {};
  let changed = false;
  const mark = () => { changed = true; };
  try {
    await api(fetchImpl, base, key, 'makan_orders?session_id=eq.demo', { method: 'DELETE', changed });
    mark();
    await api(fetchImpl, base, key, 'makan_profiles?session_id=eq.demo', { method: 'DELETE', changed: true });
    const session = await api(fetchImpl, base, key, 'makan_session?id=eq.demo', {
      method: 'PATCH', body: sessionPatch(sessionRows[0], now().toISOString()), changed: true,
    });
    if (!Array.isArray(session) || session.length !== 1 || session[0].id !== 'demo') {
      throw new Refused('The demo session did not update.', true);
    }
    for (const d of seeded) {
      const office = encodeURIComponent(d.officeId);
      const updated = await api(fetchImpl, base, key, `makan_drops?session_id=eq.demo&office_id=eq.${office}`, {
        method: 'PATCH', body: dropPatch(d, sample), changed: true,
      });
      if (!Array.isArray(updated) || updated.length !== 1 || updated[0].office_id !== d.officeId) {
        throw new Refused(`The demo drop for ${d.officeId} did not update.`, true);
      }
    }
  } catch (e) {
    if (e instanceof Refused) throw new Refused(e.message, changed || e.changed);
    throw e;
  }
  return `Demo project reset for the 3-phone lunch. Clock is back to ${clockLabel(DEMO_START)}. Aina's shared order and desk are cleared. The three drops are back at the start. The invoice is unpaid again.`;
}

function loadEnv() {
  const got = {
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  };
  if (!got.EXPO_PUBLIC_SUPABASE_URL || !got.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    for (const file of [path.join(root, 'apps/makan-hour/.env'), path.join(root, '.env')]) {
      if (!existsSync(file)) continue;
      const parsed = readDemoEnv(readFileSync(file, 'utf8'));
      if (!got.EXPO_PUBLIC_SUPABASE_URL && parsed.EXPO_PUBLIC_SUPABASE_URL) got.EXPO_PUBLIC_SUPABASE_URL = parsed.EXPO_PUBLIC_SUPABASE_URL;
      if (!got.EXPO_PUBLIC_SUPABASE_ANON_KEY && parsed.EXPO_PUBLIC_SUPABASE_ANON_KEY) got.EXPO_PUBLIC_SUPABASE_ANON_KEY = parsed.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
  return { url: got.EXPO_PUBLIC_SUPABASE_URL, key: got.EXPO_PUBLIC_SUPABASE_ANON_KEY };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] !== '--yes') {
    console.error('Refusing to run. To reset the 3-phone demo: node scripts/reset-demo.mjs --yes');
    console.error('Nothing was changed.');
    process.exit(1);
  }
  const env = loadEnv();
  try {
    const summary = await runReset({ url: env.url, key: env.key, fetchImpl: globalThis.fetch });
    console.log(summary);
  } catch (e) {
    const message = e instanceof Refused ? e.message : 'The reset did not finish. Run it again once the connection works.';
    console.error(redact(message));
    if (!(e instanceof Refused) || !e.changed) console.error('Nothing was changed.');
    else console.error('The reset stopped part way. Run the same command again. The key was not printed.');
    process.exit(1);
  }
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (entry === import.meta.url) main();
