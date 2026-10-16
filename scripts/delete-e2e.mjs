import { chromium } from 'playwright';
const APP = process.env.APP_URL || 'http://localhost:8091';
const b = await chromium.launch(); const errs = [];
for (const role of ['employee', 'admin', 'caterer']) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on('pageerror', e => errs.push(`${role}: ${e.message}`));
  const t = id => p.locator(`[data-testid="${id}"]`).first();
  await p.goto(APP); await t(`account-${role}`).click(); await t('fill-code').click(); await t('verify').click(); await t('clock').waitFor();
  await t('delete-account').click(); await t('delete-confirm-input').waitFor();
  const dis = async () => (await t('confirm-delete').getAttribute('aria-disabled')) === 'true';
  if (!await dis()) throw new Error(role + ': enabled before typing');
  await t('delete-confirm-input').fill('delete'); if (!await dis()) throw new Error(role + ': lowercase accepted');
  await t('delete-confirm-input').fill('DELETE'); if (await dis()) throw new Error(role + ': not enabled after DELETE');
  await p.waitForTimeout(600); await p.screenshot({ path: `/tmp/del-${role}.png` });
  await t('confirm-delete').click(); await t(`account-${role}`).waitFor({ timeout: 10000 });
  console.log(role, 'ok: gated on DELETE, demo reset, signed out');
}
console.log('errors', errs); await b.close();
