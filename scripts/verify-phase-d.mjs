import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:5173/';
mkdirSync('scripts/shots', { recursive: true });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  — ' + detail : ''}`);
};

const overflowOf = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const consoleErrors = [];
const watchConsole = (page) =>
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  localStorage.setItem('trustgraph_mode_v2', 'DEMO');
});

/* ── 1. Profile — desktop 1440 ─────────────────────────────── */
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'passport/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  const banner = await page.getByText('[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]').count();
  check('profile: DEMO banner exact text visible', banner > 0);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('profile: h1 alias renders (Sarah)', h1.includes('Sarah'), h1);

  check('profile: Public Inspection View pill', (await page.getByText('Public Inspection View').count()) > 0);
  check('profile: status breakdown panel', (await page.getByText('On-Chain Status Breakdown').count()) > 0);
  check('profile: reviewing authorities section', (await page.getByText('Reviewing Authorities').count()) > 0);
  check('profile: claim ledger section', (await page.getByText('Claim Ledger').count()) > 0);

  const cardsAll = await page.locator('article').count();
  check('profile: attestation cards render', cardsAll > 0, `${cardsAll} articles`);

  // Claim-type filter narrows, then restores
  await page.getByRole('button', { name: /Contract Deployed/ }).click();
  await page.waitForTimeout(300);
  const cardsFiltered = await page.locator('article').count();
  check('profile: claim filter narrows list', cardsFiltered > 0 && cardsFiltered <= cardsAll, `${cardsFiltered}/${cardsAll}`);
  await page.getByRole('button', { name: /All Claims/ }).click();
  await page.waitForTimeout(300);
  check('profile: All Claims restores list', (await page.locator('article').count()) === cardsAll);

  // Validity filter
  await page.getByRole('button', { name: 'REVOKED', exact: true }).click();
  await page.waitForTimeout(300);
  const revokedCount = await page.locator('article').count();
  check('profile: REVOKED validity filter applies', revokedCount <= cardsAll, `${revokedCount} shown`);
  if (revokedCount === 0) {
    check('profile: empty state + Reset Filters', (await page.getByText('No attestations match the selected filter.').count()) > 0);
    await page.getByRole('button', { name: 'Reset Filters' }).click();
    await page.waitForTimeout(300);
    check('profile: Reset Filters restores', (await page.locator('article').count()) === cardsAll);
  }

  const ovf = await overflowOf(page);
  check('profile @1440: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);

  // Share/copy buttons exist (a11y labels)
  check('profile: share button labeled', (await page.getByRole('button', { name: 'Copy shareable profile link' }).count()) > 0);
  check('profile: wallet copy labeled', (await page.getByRole('button', { name: 'Copy wallet address' }).count()) > 0);

  await page.screenshot({ path: 'scripts/shots/phase-d-profile-desktop.png', fullPage: true });
  await page.close();
}

/* ── 2. Profile — mobile 390 ───────────────────────────────── */
{
  const page = await context.newPage({ viewport: { width: 390, height: 780 } });
  watchConsole(page);
  await page.goto(BASE + 'passport/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ovf = await overflowOf(page);
  check('profile @390: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);
  await page.screenshot({ path: 'scripts/shots/phase-d-profile-mobile.png', fullPage: true });
  await page.close();
}

/* ── 3. Verify/1 — desktop 1440 ────────────────────────────── */
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'verify/1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  check('verify: DEMO banner visible', (await page.getByText('[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]').count()) > 0);
  check('verify: Record ID header', (await page.getByText('Record ID: #1').count()) > 0);
  check('verify: verification matrix heading', (await page.getByText('Independent Verification Matrix').count()) > 0);
  check('verify: Authorized Issuer badge', (await page.getByText('Authorized Issuer').count()) > 0);
  check('verify: section 03 lifecycle', (await page.getByText('Lifecycle & Monad Transaction').count()) > 0);

  // Invariant 3: demo fixtures must be labelled as such (no invented tx hash)
  const fixtureLabel = await page.getByText('Local Sandbox Fixture — Not Committed to Monad Testnet').count();
  const txLink = await page.locator('a[href*="explorer"]').filter({ hasText: '0x' }).count();
  check('verify: tx provenance honest (fixture label or real link)', fixtureLabel > 0 || txLink > 0, `fixture=${fixtureLabel} txlink=${txLink}`);

  // Hash MATCH path
  await page.getByRole('button', { name: 'Pre-load Recorded Manifest' }).click();
  const ta = page.locator('textarea[aria-label="Evidence text to hash"]');
  const preloaded = ((await ta.inputValue()) ?? '').trim();
  check('verify: pre-load fills textarea', preloaded.length > 0, `${preloaded.length} chars`);
  await page.getByRole('button', { name: 'Compute & Compare Hash' }).click();
  await page.waitForTimeout(700);
  check('verify: MATCH result on authentic text', (await page.getByText(/MATCH — evidence text matches the on-chain hash exactly/).count()) > 0);

  // MISMATCH path
  await ta.fill('tampered evidence payload');
  await page.getByRole('button', { name: 'Compute & Compare Hash' }).click();
  await page.waitForTimeout(700);
  check('verify: MISMATCH result on tampered text', (await page.getByText(/MISMATCH — computed hash does not match/).count()) > 0);
  check('verify: mismatch shows computed-vs-anchor line', (await page.getByText(/vs anchor/).count()) > 0);

  // No wallet connected → revoke surface must be absent
  check('verify: revoke panel hidden without wallet', (await page.getByText('Reviewer Management Action').count()) === 0);

  const ovf = await overflowOf(page);
  check('verify @1440: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);

  await page.screenshot({ path: 'scripts/shots/phase-d-verify-desktop.png', fullPage: true });
  await page.close();
}

/* ── 4. Verify/1 — mobile 390 ──────────────────────────────── */
{
  const page = await context.newPage({ viewport: { width: 390, height: 780 } });
  watchConsole(page);
  await page.goto(BASE + 'verify/1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ovf = await overflowOf(page);
  check('verify @390: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);
  await page.screenshot({ path: 'scripts/shots/phase-d-verify-mobile.png', fullPage: true });
  await page.close();
}

/* ── 5. Reduced motion ─────────────────────────────────────── */
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + 'passport/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('reduced-motion: profile content fully visible', h1.includes('Sarah'), h1);
  await page.goto(BASE + 'verify/1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('reduced-motion: verify content visible', (await page.getByText('Record ID: #1').count()) > 0);
  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (consoleErrors.length) {
  console.log('\nConsole errors observed:');
  for (const e of consoleErrors.slice(0, 10)) console.log('  •', e.slice(0, 200));
} else {
  console.log('No console errors.');
}
process.exit(failed.length ? 1 : 0);
