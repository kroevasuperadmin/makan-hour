// One-command demo reset. Does what the hidden control in the app does: signs in as the demo admin,
// holds the wordmark for 1.9 s and taps "Reset the demo". That clears the order, nudges, cutoff, drops
// and invoice payment for everyone signed in, and sets the clock back to 9:18 am.
//   npm run reset-demo                                              reset the build served on localhost:8091/app
//   APP_URL=https://makanhour.rizqey.com/app npm run reset-demo     reset the live shared demo
// Set CHROMIUM_PATH to use a Chromium that is already installed.
import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:8091/app';
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let code = 0;
try {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const t = id => p.locator(`[data-testid="${id}"]`).first();
  await p.goto(APP); await t('role-employee').waitFor({ timeout: 20000 });
  await t('account-admin').click(); await t('code-input').waitFor();
  await t('fill-code').click(); await t('verify').click(); await t('clock').waitFor();
  const box = await t('brand').boundingBox();
  await p.mouse.move(box.x + 20, box.y + 10); await p.mouse.down(); await p.waitForTimeout(1900); await p.mouse.up();
  await t('confirm-reset').click(); await t('confirm-reset').waitFor({ state: 'hidden' });
  await p.waitForTimeout(2500); // let the database writes finish
  console.log(`Demo reset at ${APP}. Clock shows ${(await t('clock').innerText()).trim()}.`);
  await t('sign-out').click();
} catch (e) { console.error('Reset failed:', e.message); code = 1; }
await b.close();
process.exit(code);
