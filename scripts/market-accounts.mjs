// Create the four marketplace test users in Supabase Auth and print nothing but emails.
// Passwords go to MARKET_ACCOUNTS_OUT (default /tmp/makan-market-accounts.txt, mode 0600).
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Does not print the key.
import { writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const url = (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const out = process.env.MARKET_ACCOUNTS_OUT || '/tmp/makan-market-accounts.txt';
const emails = [
  'siti.market@contoh.my',
  'vendor.market@dapurcontoh.my',
  'faiz.market@contoh.my',
  'farah.market@makanhour.example',
];
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. No users were created.');
  process.exit(2);
}
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const lines = [];
for (const email of emails) {
  const listed = await fetch(`${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, { headers });
  if (!listed.ok) {
    console.error(`list ${email} http ${listed.status}`);
    process.exit(1);
  }
  const body = await listed.json();
  const existing = (body.users || []).find(u => String(u.email || '').toLowerCase() === email);
  const password = randomBytes(18).toString('base64url');
  if (existing) {
    const upd = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT', headers, body: JSON.stringify({ password, email_confirm: true }),
    });
    if (!upd.ok) {
      console.error(`update ${email} http ${upd.status}`);
      process.exit(1);
    }
    console.log(`reset ${email}`);
  } else {
    const created = await fetch(`${url}/auth/v1/admin/users`, {
      method: 'POST', headers, body: JSON.stringify({ email, password, email_confirm: true }),
    });
    if (!created.ok) {
      console.error(`create ${email} http ${created.status}`);
      process.exit(1);
    }
    console.log(`created ${email}`);
  }
  lines.push(`${email} ${password}`);
}
writeFileSync(out, `${lines.join('\n')}\n`, { mode: 0o600 });
chmodSync(out, 0o600);
console.log(`passwords written to ${out}`);
