// Apply marketplace SQL to the live Supabase project. This file is not run by the app.
// Requires SUPABASE_ACCESS_TOKEN (a personal access token). Never prints the token.
// Order: migration 5, member roles, migration 6.
// Refuses drop, truncate, or delete of an office-lunch table.
// Only the member-roles file may alter makan_members, and only that table.
// With SUPABASE_SERVICE_ROLE_KEY, writes a JSON backup of those tables before any SQL.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ref = 'rlfllmhcjqhgeoikjbha';
const files = [
  'supabase/makan_migration_5_marketplace.sql',
  'supabase/makan_members_market_roles.sql',
  'supabase/makan_migration_6_marketplace_rls.sql',
];
const roleFile = 'supabase/makan_members_market_roles.sql';
const office = ['makan_session', 'makan_orders', 'makan_drops', 'makan_profiles', 'makan_members', 'makan_offices', 'makan_push_tokens'];
const destructive = new RegExp(`\\b(drop\\s+table|truncate|delete\\s+from)\\s+(if\\s+exists\\s+)?(public\\.)?(${office.join('|')})\\b`, 'i');
const alterAny = new RegExp(`\\balter\\s+table\\s+(if\\s+exists\\s+)?(public\\.)?(${office.join('|')})\\b`, 'i');
const alterOther = new RegExp(`\\balter\\s+table\\s+(if\\s+exists\\s+)?(public\\.)?(${office.filter(t => t !== 'makan_members').join('|')})\\b`, 'i');

for (const f of files) {
  const sql = readFileSync(resolve(root, f), 'utf8');
  const bad = destructive.test(sql) || (f === roleFile ? alterOther.test(sql) : alterAny.test(sql));
  if (bad) {
    console.error(`refusing ${f}: it names a destructive change to an office-lunch table`);
    process.exit(1);
  }
}

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const url = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rlfllmhcjqhgeoikjbha.supabase.co').replace(/\/$/, '');

if (service) {
  const dir = process.env.MARKET_BACKUP_DIR || '/tmp/makan-office-backup';
  mkdirSync(dir, { recursive: true });
  for (const table of office) {
    const r = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: { apikey: service, authorization: `Bearer ${service}` },
    });
    const body = await r.text();
    writeFileSync(resolve(dir, `${table}.json`), body);
    console.log(`backup ${table} http ${r.status} bytes ${body.length}`);
    if (!r.ok && r.status !== 404) process.exit(1);
  }
  console.log(`backup dir ${dir}`);
} else {
  console.log('no service role key, so no JSON backup was written');
}

if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN is not set. SQL was not applied.');
  process.exit(2);
}

async function query(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error(`query failed http ${r.status} ${text.slice(0, 400)}`);
    process.exit(1);
  }
  return text;
}

const before = await query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'makan_%' order by 1`);
console.log(`tables before ${before.slice(0, 800)}`);

for (const f of files) {
  const sql = readFileSync(resolve(root, f), 'utf8');
  await query(sql);
  console.log(`applied ${f}`);
}

const after = await query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'makan_%' order by 1`);
console.log(`tables after ${after.slice(0, 800)}`);
