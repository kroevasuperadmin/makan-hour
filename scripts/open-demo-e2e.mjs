// Open demo: any email, four sides, sample kitchens, no office or saved-order calls.
// Start the web build with MAKAN_OPEN_DEMO=on. With the flag off this script should fail.
import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://127.0.0.1:8092/app/';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
const hits = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('request', req => {
  const u = req.url();
  if (/makan_members|makan_orders|makan_session|makan_drops|makan_profiles|makan_offices|makan_market_feed|makan_claim_market|makan_claim_invites|makan_place_order|\/api\/pay\//.test(u)) hits.push(u);
});
const t = id => page.locator(`[data-testid="${id}"]`).first();

await page.goto(APP);
await t('open-create').waitFor();
if (await page.locator('[data-testid="role-employee"]').count()) throw new Error('office door still shown');
if (await page.locator('[data-testid="account-employee"]').count()) throw new Error('office demo account still shown');
await t('open-email').fill('jason@company.my');
await t('open-password').fill('jason-demo');
await t('open-create').click();
await t('role-switcher').waitFor();
await t('market-shell-customer').waitFor();
await t('restaurant-r1').waitFor();
await t('restaurant-r2').waitFor();
await t('restaurant-r3').waitFor();
if (!/Sample kitchens/.test(await t('market-preview').innerText())) throw new Error('preview copy');

await t('restaurant-r1').click();
await t('add-i-ayam').click();
await t('market-tab-cart').click();
await t('market-place-order').click();
await t('market-placed').waitFor();
if (await page.locator('[data-testid="market-continue-pay"]').count()) throw new Error('stripe button shown');

await t('role-switch-vendor').click();
await t('market-shell-vendor').waitFor();
await t('market-order-mkt-5').waitFor();
await t('role-switch-rider').click();
await t('market-shell-rider').waitFor();
await t('market-pickup-mkt-seed-2').waitFor();
await t('role-switch-admin').click();
await t('market-shell-admin').waitFor();
await t('market-order-mkt-seed-1').waitFor();
await t('market-order-mkt-5').waitFor();
const all = Number(await t('market-count-all').innerText());
if (all < 5) throw new Error(`admin count ${all}`);
await t('role-switch-customer').click();
await t('market-shell-customer').waitFor();

await t('sign-out').click();
await t('open-signin').waitFor();
await t('open-email').fill('jason@company.my');
await t('open-password').fill('jason-demo');
await t('open-signin').click();
await t('role-switcher').waitFor();
await t('role-switch-admin').click();
await t('market-shell-admin').waitFor();

if (hits.length) throw new Error('real data calls: ' + hits.join(' | '));
const real = errs.filter(e => !/WebSocket|realtime|status of 50[3]|status of 403/i.test(e));
console.log('ERRORS:', JSON.stringify(real));
await b.close();
process.exit(real.length ? 1 : 0);
