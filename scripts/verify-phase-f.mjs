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

/* ── 1. Homepage — desktop 1440 ────────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('home: hero h1 renders', h1.toLowerCase().includes('evidence'), h1);

  check('home: Explore a Passport CTA', (await page.getByRole('link', { name: /Explore a Passport/ }).count()) > 0);
  check('home: Verify a Claim CTA', (await page.getByRole('link', { name: /Verify a Claim/ }).count()) > 0);
  check('home: DEMO banner exact text', (await page.getByText('[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]').count()) > 0);

  const canvasCount = await page.locator('canvas').count();
  check('home: 3D scene canvas active (WebGL available)', canvasCount > 0, `${canvasCount} canvas`);

  const ovf = await overflowOf(page);
  check('home @1440: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);

  await page.screenshot({ path: 'scripts/shots/phase-f-home-desktop.png' });
  await page.close();
}

/* ── 2. Homepage — WebGL disabled → static fallback ────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  const svgCount = await page.locator('svg').count();
  check('fallback: static SVG constellation renders without WebGL', svgCount > 0, `${svgCount} svgs`);
  check('fallback: no canvas created', (await page.locator('canvas').count()) === 0);

  const explore = page.getByRole('link', { name: /Explore a Passport/ }).first();
  check('fallback: CTAs still interactable', (await explore.isEnabled()) === true);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('fallback: hero content intact', h1.length > 5, h1.slice(0, 60));

  const errs = consoleErrors.filter((e) => /webgl|three/i.test(e));
  check('fallback: no WebGL/three console errors', errs.length === 0, errs[0]?.slice(0, 120) ?? '');

  await page.close();
}

/* ── 3. Homepage — reduced motion ──────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  watchConsole(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const h1 = (await page.locator('h1').first().textContent()) ?? '';
  check('reduced-motion: hero visible immediately', h1.length > 5, h1.slice(0, 60));
  check('reduced-motion: static fallback (no canvas)', (await page.locator('canvas').count()) === 0);
  await page.close();
}

/* ── 4. Homepage — mobile 390 ──────────────────────────────── */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  watchConsole(page);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const ovf = await overflowOf(page);
  check('home @390: no horizontal overflow', ovf <= 0, `overflow=${ovf}px`);
  await page.screenshot({ path: 'scripts/shots/phase-f-home-mobile.png', fullPage: true });
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
