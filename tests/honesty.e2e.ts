import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

/**
 * Guards the demo-honesty invariants: fixture data must never be presented as
 * live Monad chain state, and local issue/revoke must never claim an on-chain
 * transaction. These run against the real app in a browser WITHOUT an injected
 * wallet (so they exercise the demo path only).
 */
describe('TrustGraph Demo-Honesty Suite', () => {
  const DEV = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';

  test('demo-mode banner is present on every core route', async ({ app, screen }) => {
    for (const route of ['/', `/profile/${DEV}`, '/issue', '/verify/1', `/graph/${DEV}`]) {
      await app.open(route);
      await expect(screen.getByText(/DEMO MODE: LOCAL FIXTURES/)).toBeVisible();
    }
  });

  test('navbar shows a local-fixtures indicator, never a live toggle', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByText('LOCAL FIXTURES')).toBeVisible();
    await expect(screen.getByText('LIVE MONAD')).toHaveCount(0);
  });

  test('fixture records are labelled on passports and the reviewer queue', async ({ app, screen }) => {
    await app.open(`/profile/${DEV}`);
    await expect(screen.getByText('Local Fixture').first()).toBeVisible();
    await app.open('/verify');
    await expect(screen.getByText('Local Fixture').first()).toBeVisible();
  });

  test('local issuance never claims a Monad transaction', async ({ app, screen }) => {
    await app.open('/issue');
    await screen.getByLabel(/Claim Title/).fill('E2E Local Fixture Title');
    await screen.getByLabel(/Reviewer Explanation/).fill('Automated e2e sandbox submission.');
    await screen.getByLabel(/Evidence URL/).fill('https://example.com/evidence');
    await screen.getByRole('button', { name: 'Issue & Record Attestation' }).click();

    await expect(screen.getByText('Local Fixture Recorded')).toBeVisible();
    await expect(screen.getByText(/recorded as a local sandbox fixture/i)).toBeVisible();
    await expect(screen.getByText('Anchoring on Monad')).toHaveCount(0);
    await expect(screen.getByText('Receipt confirmed on Monad')).toHaveCount(0);
  });

  test('demo revocation never claims an on-chain record', async ({ app, screen }) => {
    await app.open('/verify');
    await screen.getByRole('button', { name: 'Revoke' }).first().click();
    const dialog = screen.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('local sandbox');
    await expect(screen.getByText(/Revocation is recorded on Monad/)).toHaveCount(0);
  });
});
