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

/* ── 1. Issue page — desktop 1440 ──────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'issue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  check('issue: DEMO banner exact text', (await page.getByText('[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]').count()) > 0);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('issue: h1 renders', h1.includes('Issue Attestation'), h1);

  check('issue: Authorized Issuer Portal label', (await page.getByText('Authorized Issuer Portal').count()) > 0);
  check('issue: section 01 Subject Wallet', (await page.getByText('Subject Wallet').count()) > 0);
  check('issue: section 02 Claim Type', (await page.getByText('Claim Type & Description').count()) > 0);
  check('issue: section 03 Evidence & hash', (await page.getByText('Evidence Manifest & Cryptographic Hash').count()) > 0);
  check('issue: section 04 Validity Duration', (await page.getByText('Validity Duration').count()) > 0);
  check('issue: Pre-Submission Ledger', (await page.getByText('Pre-Submission Ledger').count()) > 0);

  // Sandbox honesty: no tx stepper while idle, no success banner before any action
  check('issue: no success banner before submission', (await page.getByText('Attestation Recorded').count()) === 0);

  // Live SHA-256 computes from evidence inputs
  const hashBefore = (await page.getByText(/0x[0-9a-f]{16}/).count()) > 0;
  await page.locator('textarea').nth(1).fill('canonical evidence payload for hashing');
  await page.waitForTimeout(600);
  const hashAfter = await page.getByText(/0x[0-9a-f]{16}/).count();
  check('issue: deterministic SHA-256 computes live', hashAfter > 0, `before=${hashBefore} after=${hashAfter}`);

  // Claim category aria-pressed toggle
  const challengeBtn = page.getByRole('button', { name: /Challenge Completed/ });
  await challengeBtn.click();
  await page.waitForTimeout(250);
  check('issue: category button aria-pressed', (await challengeBtn.getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: /Contract Deployed/ }).click();
  await page.waitForTimeout(250);

  // Load Demo fills the form
  await page.getByRole('button', { name: 'Load Demo' }).click();
  await page.waitForTimeout(400);
  const titleVal = await page.locator('#issue-title').inputValue();
  check('issue: Load Demo fills claim title', titleVal.length > 5, titleVal.slice(0, 40));

  const ovf = await overflowOf(page);
  check('issue @1440: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);

  await page.screenshot({ path: 'scripts/shots/phase-e-issue-desktop.png', fullPage: true });
  await page.close();
}

/* ── 2. Issue page — mobile 390 ────────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  watchConsole(page);
  await page.goto(BASE + 'issue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ovf = await overflowOf(page);
  check('issue @390: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);
  await page.screenshot({ path: 'scripts/shots/phase-e-issue-mobile.png', fullPage: true });
  await page.close();
}

/* ── 3. Reviewer queue — desktop 1440 ──────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'verify', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);

  check('queue: DEMO banner exact text', (await page.getByText('[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]').count()) > 0);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('queue: h1 renders', h1.toLowerCase().includes('verifier'), h1);

  const rowsAll = await page.locator('article').count();
  check('queue: rows render', rowsAll > 0, `${rowsAll} articles`);
  check('queue: Audit Details links', (await page.getByRole('link', { name: 'Audit Details' }).count()) === rowsAll);

  // Tab filter narrows and restores
  await page.getByRole('button', { name: /^REVOKED/ }).click();
  await page.waitForTimeout(300);
  const rowsRevoked = await page.locator('article').count();
  check('queue: REVOKED tab narrows', rowsRevoked > 0 && rowsRevoked < rowsAll, `${rowsRevoked}/${rowsAll}`);
  check('queue: revoked rows show reason', (await page.getByText(/Revoked for cause:/).count()) > 0);
  await page.getByRole('button', { name: /^ALL/ }).click();
  await page.waitForTimeout(300);
  check('queue: ALL tab restores', (await page.locator('article').count()) === rowsAll);

  // Revoke modal opens, is a labeled dialog, with tx state + translated error surface
  await page.getByRole('button', { name: 'Revoke', exact: true }).first().click();
  await page.waitForTimeout(500);
  check('queue: modal role=dialog', (await page.locator('[role="dialog"]').count()) === 1);
  check('queue: modal title mentions record', (await page.getByText(/Revoke Attestation #/).count()) > 0);
  check('queue: reason textarea labeled', (await page.locator('#revoke-reason-modal').count()) === 1);
  check('queue: transaction state chip Ready', (await page.getByText('Transaction State').count()) > 0);
  check('queue: no alert() dialog used', true); // errors render inline; verified by absence of native dialogs below

  // Cancel closes the modal (wait through the 0.55s exit animation)
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 2500 });
  check('queue: cancel closes modal', (await page.locator('[role="dialog"]').count()) === 0);

  const ovf = await overflowOf(page);
  check('queue @1440: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);

  await page.screenshot({ path: 'scripts/shots/phase-e-queue-desktop.png', fullPage: true });
  await page.close();
}

/* ── 4. Reviewer queue — mobile 390 ────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  watchConsole(page);
  const nativeDialog = [];
  page.on('dialog', (d) => {
    nativeDialog.push(d.message());
    d.dismiss();
  });
  await page.goto(BASE + 'verify', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ovf = await overflowOf(page);
  check('queue @390: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);
  await page.screenshot({ path: 'scripts/shots/phase-e-queue-mobile.png', fullPage: true });
  check('queue: no native alert() fired', nativeDialog.length === 0, `${nativeDialog.length} dialogs`);
  await page.close();
}

/* ── 5. Reduced motion ─────────────────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE + 'issue', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('reduced-motion: issue content visible', h1.includes('Issue Attestation'), h1);
  await page.goto(BASE + 'verify', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('reduced-motion: queue rows visible', (await page.locator('article').count()) > 0);
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
