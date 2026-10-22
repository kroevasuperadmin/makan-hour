// One browser, one page: marketplace state is in memory and must survive sign-out.
// Does not sign in to office accounts and does not reset the corporate demo.
import { chromium } from 'playwright';

const APP = process.env.APP_URL || 'http://localhost:8091';
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const t = id => page.locator(`[data-testid="${id}"]`).first();

async function signIn(accountId) {
  if (!page.url().startsWith(APP)) await page.goto(APP);
  await t(accountId).click();
  await t('fill-code').click();
  await t('verify').click();
  await t('market-preview').waitFor();
}
async function signOut() {
  await t('sign-out').click();
  await t('role-customer').waitFor();
}

await page.goto(APP);
await t('role-customer').waitFor();
await t('role-employee').waitFor();
await signIn('account-customer');
await t('market-shell-customer').waitFor();
await t('restaurant-r1').click();
await t('add-i-ayam').click();
await t('market-badge-cart').waitFor();
if ((await t('market-badge-cart').innerText()) !== '1') throw new Error('cart badge');
await t('market-tab-cart').click();
await t('market-place-order').click();
await t('market-placed').waitFor();
await t('market-status-mkt-5').waitFor();
if (!/Placed/.test(await t('market-status-mkt-5').innerText())) throw new Error('order not placed');
if (await page.locator('[data-testid="market-order-mkt-seed-1"]').count()) throw new Error('customer saw another person\'s order');
await signOut();

await signIn('account-vendor');
if (await page.locator('[data-testid="market-order-mkt-seed-4"]').count()) throw new Error('vendor saw another restaurant');
await t('market-order-mkt-5').waitFor();
for (const label of ['Accepted', 'Preparing', 'Ready for pickup']) {
  await t('market-advance-mkt-5').click();
  await page.locator('[data-testid="market-status-mkt-5"]').filter({ hasText: label }).waitFor();
}
await t('market-tab-menu').click();
await t('menu-i-kandar').waitFor();
await t('market-toggle-i-kandar').click();
await signOut();

await signIn('account-rider');
await t('market-pickup-mkt-5').click();
await t('market-deliver-mkt-5').waitFor();
await t('market-deliver-mkt-5').click();
await page.locator('[data-testid="market-status-mkt-5"]').filter({ hasText: 'Delivered' }).waitFor();
await t('market-pickup-mkt-seed-2').click();
await t('market-deliver-mkt-seed-2').click();
await signOut();

await signIn('account-market-admin');
await page.locator('[data-testid="market-order-mkt-5"]').filter({ hasText: 'Delivered' }).waitFor();
await t('market-order-mkt-seed-4').waitFor();
const all = Number(await t('market-count-all').innerText());
if (all < 5) throw new Error(`admin count ${all}`);
await signOut();

await signIn('account-customer');
await t('restaurant-r1').click();
if (await page.locator('[data-testid="add-i-kandar"]').count()) throw new Error('hidden dish still listed');
await t('add-i-ayam').waitFor();
await signOut();

const real = errs.filter(e => !/WebSocket|realtime|status of 50[3]|status of 403/i.test(e));
console.log('ERRORS:', JSON.stringify(real));
await b.close();
process.exit(real.length ? 1 : 0);
