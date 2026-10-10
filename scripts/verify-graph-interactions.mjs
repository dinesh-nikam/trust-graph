/* eslint-disable */
// Phase C interaction verification: overflow, filters, mobile drawer, reduced motion.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const URL = 'http://127.0.0.1:5173/graph/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';

// ── Desktop ──────────────────────────────────────────────
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(URL, { waitUntil: 'networkidle' });
await desktop.waitForTimeout(2000);

const overflow = await desktop.evaluate(() => {
  const doc = document.documentElement;
  const culprits = [];
  if (doc.scrollWidth > doc.clientWidth) {
    document.querySelectorAll('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > doc.clientWidth + 1 && r.width > 20 && culprits.length < 10) {
        culprits.push({
          tag: el.tagName,
          cls: String(el.className).slice(0, 80),
          right: Math.round(r.right),
          parent: el.parentElement ? String(el.parentElement.className).slice(0, 60) : null,
        });
      }
    });
  }
  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: doc.clientWidth,
    culprits,
  };
});
console.log('DESKTOP OVERFLOW:', JSON.stringify(overflow, null, 2));

// Filter switch → fewer nodes, entrances replay
await desktop.getByRole('button', { name: 'CONTRACT' }).click();
await desktop.waitForTimeout(1200);
const filtered = await desktop.evaluate(() => ({
  nodes: document.querySelectorAll('.react-flow__node').length,
  edges: document.querySelectorAll('.react-flow__edge').length,
  subjectClaims: document.querySelector('[data-testid="subject-claim-count"]')?.textContent,
}));
console.log('FILTER CONTRACT:', JSON.stringify(filtered));
await desktop.getByRole('button', { name: 'All', exact: true }).click();
await desktop.waitForTimeout(800);

// ── Mobile ───────────────────────────────────────────────
const mobile = await browser.newPage({ viewport: { width: 390, height: 780 } });
await mobile.goto(URL, { waitUntil: 'networkidle' });
await mobile.waitForTimeout(2000);

const mobileBefore = await mobile.evaluate(() => ({
  sidePanelVisible: (() => {
    const aside = document.querySelector('aside');
    return aside ? getComputedStyle(aside).display : 'none';
  })(),
  drawerOpen: !!document.querySelector('[role="dialog"]'),
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
console.log('MOBILE BEFORE CLICK:', JSON.stringify(mobileBefore));

await mobile.locator('[data-id="claim-2"]').click();
await mobile.waitForTimeout(900);
const mobileAfter = await mobile.evaluate(() => {
  const dialog = document.querySelector('[role="dialog"]');
  return {
    drawerOpen: !!dialog,
    drawerText: dialog ? dialog.textContent.slice(0, 120) : null,
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
});
console.log('MOBILE AFTER CLICK:', JSON.stringify(mobileAfter));
await mobile.screenshot({ path: 'scripts/graph-mobile-drawer.png' });

// close drawer via the X button inside the dialog
await mobile.locator('[role="dialog"] button[aria-label="Close inspector"]').click();
await mobile.waitForTimeout(600);
const mobileClosed = await mobile.evaluate(() => ({ drawerOpen: !!document.querySelector('[role="dialog"]') }));
console.log('MOBILE AFTER CLOSE:', JSON.stringify(mobileClosed));

// ── Reduced motion ───────────────────────────────────────
const rm = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await rm.goto(URL, { waitUntil: 'networkidle' });
await rm.waitForTimeout(1500);
const rmState = await rm.evaluate(() => ({
  edges: document.querySelectorAll('.react-flow__edge').length,
  animatedEdges: document.querySelectorAll('.react-flow__edge.animated').length,
  transform: document.querySelector('.react-flow__viewport')?.style.transform,
}));
console.log('REDUCED MOTION:', JSON.stringify(rmState));

await browser.close();
console.log('DONE');
