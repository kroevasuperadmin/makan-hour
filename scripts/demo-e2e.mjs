// Three-device click-through of the demo: one app, three browser contexts (like three phones),
// each signed in as a different demo account. State syncs through Supabase in real time.
// APP_URL defaults to a local static server on :8091.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const APP = process.env.APP_URL || 'http://localhost:8091';
const ROLE = { employee: 'employee', admin: 'admin', kitchen: 'caterer' };
const OUT = process.env.OUT || new globalThis.URL('../docs/screens/', import.meta.url).pathname;
const SHOTS = process.env.NO_SHOTS ? false : true;
const b = await chromium.launch();
const errs = [];
async function open(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
  p.on('console', m => m.type() === 'error' && errs.push(`${name}: ${m.text()}`));
  mkdirSync(OUT + name, { recursive: true });
  const t = id => p.locator(`[data-testid="${id}"]`).first();
  const shot = async n => { if (!SHOTS) return; await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}${name}/${n}.png` }); console.log('shot', name, n); };
  await p.goto(APP); await t('send-code').waitFor();
  if (name === 'employee') { mkdirSync(OUT + 'signin', { recursive: true }); if (SHOTS) { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}signin/01-sign-in.png` }); } }
  await t(`account-${ROLE[name]}`).click(); await t('code-input').waitFor();
  await t('code-input').fill('111111'); await t('verify').click(); await p.getByText('doesn’t match').first().waitFor(); // wrong code is rejected
  await t('fill-code').click();
  if (name === 'employee' && SHOTS) { await p.waitForTimeout(300); await p.screenshot({ path: `${OUT}signin/02-code.png` }); }
  await t('verify').click(); await t('clock').waitFor();
  return { p, t, shot };
}
const live = 15000; // max wait for a change to arrive from another device
const E = await open('employee'), A = await open('admin'), K = await open('kitchen');

// Reset from Admin: hidden long-press on the wordmark
const box = await A.t('brand').boundingBox();
await A.p.mouse.move(box.x + 20, box.y + 10); await A.p.mouse.down(); await A.p.waitForTimeout(1900); await A.p.mouse.up();
await A.t('confirm-reset').click();
await E.t('dish-d1').waitFor({ timeout: live }); await E.p.waitForTimeout(1500);
const before = Number(await K.t('batch-total').innerText());
const hcBefore = Number(await A.t('headcount').innerText());

await E.shot('01-menu');
await E.t('dish-d1').click(); await E.shot('02-dish-selected');
await E.t('place-order').click(); await E.t('ordered-panel').waitFor(); await E.shot('03-ordered');
await E.t('edit-spot').click(); await E.t('desk-input').fill('Desk 12-09'); await E.t('save-spot').click();

await A.p.waitForFunction(n => Number(document.querySelector('[data-testid=headcount]')?.textContent) === n + 1, hcBefore, { timeout: live });
await A.shot('01-today-live-headcount');
await K.p.waitForFunction(n => Number(document.querySelector('[data-testid=batch-total]')?.textContent) === n + 1, before, { timeout: live });
await K.shot('01-batch-provisional');
await A.t('nudge-all').click(); await A.shot('02-nudged');

await A.t('simulate-cutoff').click(); await A.shot('03-after-cutoff');
await E.p.getByText('Ordering closed at 10:30 am').first().waitFor({ timeout: live }); await E.shot('04-locked');
await K.t('confirm-batch').waitFor({ timeout: live });
await K.p.waitForFunction(() => !document.querySelector('[data-testid=confirm-batch]')?.getAttribute('aria-disabled'), null, { timeout: live });
await K.t('confirm-batch').click(); await K.shot('02-batch-confirmed');
await K.t('caterer-c2').click(); await K.shot('03-second-kitchen'); await K.t('caterer-c1').click();
await K.t('cat-tab-labels').click(); await K.p.getByText('Desk 12-09').first().waitFor({ timeout: live }); await K.shot('04-labels');
await K.t('cat-tab-drops').click(); await K.t('advance-o1').click(); await K.t('advance-o1').click(); await K.shot('05-out-for-delivery');
await K.t('delay-o1').click(); await K.shot('06-delay-sent');
await E.t('delay-alert').waitFor({ timeout: live }); await E.shot('05-delay-alert');
await A.p.getByText('staff already told').first().waitFor({ timeout: live }); await A.shot('04-drop-delayed');
await K.t('advance-o1').click(); await K.shot('07-delivered');
await E.t('delivered-panel').waitFor({ timeout: live }); await E.shot('06-delivered');

const nar = await A.p.evaluate(() => innerWidth);
if (nar < 820) await A.t('admin-tab-invoice').click();
await A.shot('05-invoice');
await A.t('pay-invoice').click(); await A.t('sandbox-banner').waitFor(); await A.t('bank-0').click(); await A.shot('06-fpx-sandbox-bank');
await A.t('to-approve').click(); await A.shot('07-fpx-sandbox-approve');
await A.t('approve-pay').click(); await A.t('paid-panel').waitFor(); await A.shot('08-invoice-paid');
if (SHOTS) { await A.p.setViewportSize({ width: 1180, height: 820 }); await A.p.waitForTimeout(600); await A.p.screenshot({ path: `${OUT}admin/09-tablet-landscape.png` }); console.log('shot admin 09-tablet-landscape'); }

// sign-out returns to sign-in
await K.t('sign-out').click(); await K.t('send-code').waitFor();
await E.t('sign-out').click(); await E.t('send-code').waitFor();
// leave the shared demo clean
const box2 = await A.t('brand').boundingBox();
await A.p.mouse.move(box2.x + 20, box2.y + 10); await A.p.mouse.down(); await A.p.waitForTimeout(1900); await A.p.mouse.up();
await A.t('confirm-reset').click(); await A.p.waitForTimeout(2500);
await A.t('sign-out').click(); await A.t('send-code').waitFor();
const real = errs.filter(e => !/WebSocket|realtime/i.test(e));
console.log('ERRORS:', JSON.stringify(real));
await b.close();
process.exit(real.length ? 1 : 0);
