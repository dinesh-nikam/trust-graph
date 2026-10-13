import { chromium } from 'playwright-core';

const BASE = 'http://localhost:5173/';
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const consoleErrors = [];
const watchConsole = (page) => {
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  localStorage.setItem('trustgraph_mode_v2', 'DEMO');
});

// 1. Check Homepage
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const heading = await page.getByRole('heading', { level: 1 }).textContent();
  check('homepage: heading contains "Trust the evidence"', heading?.includes('Trust the evidence'));
  check('homepage: chain 10143 badge visible', (await page.getByText('Monad Testnet · Chain 10143').count()) > 0);
  check('homepage: search input with exact placeholder', (await page.getByPlaceholder('0x address, claim #, or "sarah"').count()) > 0);
  await page.close();
}

// 2. Check /verify
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'verify', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const heading = await page.getByRole('heading', { level: 1 }).textContent();
  check('verify: heading is "Reviewer Verification Management"', heading?.includes('Reviewer Verification Management'));
  check('verify: "DEVELOPER SUBMISSIONS" tab visible', (await page.getByText('DEVELOPER SUBMISSIONS').count()) > 0);
  check('verify: "ALL ATTESTATIONS" tab visible', (await page.getByText('ALL ATTESTATIONS').count()) > 0);
  check('verify: developer work items render in queue', (await page.locator('article').count()) > 0);
  
  // Test clicking ALL ATTESTATIONS
  await page.getByRole('button', { name: /ALL ATTESTATIONS/i }).click();
  await page.waitForTimeout(300);
  check('verify: switching to ALL ATTESTATIONS shows records', (await page.locator('article').count()) > 0);

  await page.close();
}

// 3. Check /submit
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'submit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const heading = await page.getByRole('heading', { level: 1 }).textContent();
  check('submit: heading is "Submit Work for Verification"', heading?.includes('Submit Work for Verification'));
  check('submit: pipeline banner visible', (await page.getByText('DEVELOPER EVIDENCE SUBMISSION PIPELINE').count()) > 0);

  // Click Load Demo Template
  await page.getByRole('button', { name: /Load Demo Template/i }).click();
  await page.waitForTimeout(800);
  check('submit: deterministic hash computed', (await page.getByText(/Deterministic Hash Computed/i).count()) > 0);

  // Submit Work Claim
  await page.getByRole('button', { name: /Submit Work Claim/i }).click();
  await page.waitForTimeout(1000);
  check('submit: success confirmation', (await page.getByText(/Work Claim Submitted Successfully/i).count()) > 0);
  check('submit: pending status visible', (await page.getByText('PENDING REVIEW').count()) > 0);

  await page.close();
}

// 4. Check /graph/:address
{
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE + 'graph/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const heading = await page.getByRole('heading', { level: 1 }).textContent();
  check('graph: heading alias is Sarah', heading?.includes('Sarah'));
  check('graph: "Graph Explorer" badge visible', (await page.getByText('Graph Explorer').count()) > 0);
  check('graph: "Inspector" panel visible', (await page.getByText('Inspector').first().count()) > 0);

  await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n================================`);
console.log(`${results.length - failed.length}/${results.length} all route tests passed`);
console.log(`================================`);
if (consoleErrors.length) {
  console.log('Console errors:', consoleErrors);
} else {
  console.log('Zero console errors observed.');
}
process.exit(failed.length ? 1 : 0);
