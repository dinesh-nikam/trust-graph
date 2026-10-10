/* eslint-disable */
// One-off visual verification for the Trust Explorer graph page.
// Usage: node scripts/verify-graph.mjs
import { chromium } from 'playwright-core';

const channels = ['msedge', 'chrome'];
let browser = null;
let used = '';
for (const channel of channels) {
  try {
    browser = await chromium.launch({ channel, headless: true });
    used = channel;
    break;
  } catch (e) {
    console.log(`channel ${channel} unavailable: ${e.message.split('\n')[0]}`);
  }
}
if (!browser) {
  console.error('NO BROWSER AVAILABLE');
  process.exit(1);
}
console.log(`Using channel: ${used}`);

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') {
    console.log(`[console.${msg.type()}] ${msg.text().slice(0, 300)}`);
  }
});
page.on('pageerror', (err) => console.log(`[pageerror] ${err.message.slice(0, 300)}`));

await page.goto('http://127.0.0.1:5173/graph/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1', {
  waitUntil: 'networkidle',
  timeout: 30000,
});
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const viewport = document.querySelector('.react-flow__viewport');
  return {
    visibility: document.visibilityState,
    nodeCount: document.querySelectorAll('.react-flow__node').length,
    edgeCount: document.querySelectorAll('.react-flow__edge').length,
    edgePaths: document.querySelectorAll('.react-flow__edge-path').length,
    transform: viewport ? viewport.style.transform : null,
    controls: document.querySelectorAll('.react-flow__controls-button').length,
    inspector: !!document.querySelector('aside'),
    inspectorKind: document.querySelector('aside span.bg-surface-subtle')?.textContent ?? null,
  };
});
console.log(JSON.stringify(result, null, 2));

await page.screenshot({ path: 'scripts/graph-desktop.png', fullPage: false });

// Click an issuer node to test selection + edge highlight
const issuer = page.locator('[data-id="issuer-2"]');
if (await issuer.count()) {
  await issuer.click();
  await page.waitForTimeout(800);
  const afterClick = await page.evaluate(() => {
    const active = document.querySelectorAll('.react-flow__edge.animated');
    const aside = document.querySelector('aside');
    return {
      animatedEdges: active.length,
      inspectorText: aside ? aside.textContent.slice(0, 180) : null,
    };
  });
  console.log('AFTER ISSUER CLICK:', JSON.stringify(afterClick, null, 2));
  await page.screenshot({ path: 'scripts/graph-selected.png', fullPage: false });
}

await browser.close();
console.log('DONE');
