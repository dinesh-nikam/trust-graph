import { beforeEach, describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('TrustGraph E2E Suite', () => {
  beforeEach(async ({ browser }) => {
    await browser.addInitScript(() => {
      localStorage.setItem('trustgraph_mode_v2', 'DEMO');
    });
  });

  test('homepage renders hero heading and registry overview', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', { level: 1 })).toContainText('Trust the evidence');
    await expect(screen.getByText('Monad Testnet · Chain 10143').first()).toBeVisible();
    await expect(screen.getByPlaceholder('0x address, claim #, or "sarah"')).toBeVisible();
  });

  test('developer submission page displays form controls and hashing guide', async ({ app, screen, browser }) => {
    await app.open('/submit');
    await expect(browser).toHaveURL('/submit');
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Submit Work for Verification');
    await expect(screen.getByText('DEVELOPER EVIDENCE SUBMISSION PIPELINE')).toBeVisible();
  });

  test('trust profile page displays developer identity and attestations', async ({ app, screen, browser }) => {
    const devAddress = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';
    await app.open(`/profile/${devAddress}`);
    await expect(browser).toHaveURL(`/profile/${devAddress}`);
    await expect(screen.getByRole('heading', { name: 'Sarah (Demo Builder)' })).toBeVisible();
    await expect(screen.getByText('Public Inspection View')).toBeVisible();
  });

  test('issue attestation portal displays form controls', async ({ app, screen, browser }) => {
    await app.open('/issue');
    await expect(browser).toHaveURL('/issue');
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Issue Attestation');
    await expect(screen.getByText('Authorized Issuer Portal')).toBeVisible();
  });

  test('verifier triage queue renders management portal and submissions tab', async ({ app, screen, browser }) => {
    await app.open('/verify');
    await expect(browser).toHaveURL('/verify');
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Reviewer Verification Management');
    await expect(screen.getByText('DEVELOPER SUBMISSIONS')).toBeVisible();
  });

  test('verification detail page inspects attestation proof and cryptographic hash', async ({ app, screen, browser }) => {
    await app.open('/verify/1');
    await expect(browser).toHaveURL('/verify/1');
    await expect(screen.getByText('Record ID: #1')).toBeVisible();
    await expect(screen.getByText('Independent Verification Matrix')).toBeVisible();
    await expect(screen.getByText('Authorized Issuer')).toBeVisible();
  });

  test('trust graph page visualizes attestation network', async ({ app, screen, browser }) => {
    const devAddress = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';
    await app.open(`/graph/${devAddress}`);
    await expect(browser).toHaveURL(`/graph/${devAddress}`);
    await expect(screen.getByRole('heading', { name: 'Sarah (Demo Builder)' })).toBeVisible();
    await expect(screen.getByText('Graph Explorer')).toBeVisible();
    await expect(screen.getByText('Inspector')).toBeVisible();
  });

  test('interactive developer submission flow computes canonical hash and creates pending claim', async ({ app, screen }) => {
    await app.open('/submit');
    await screen.getByRole('button', { name: /Load Demo Template/i }).click();
    await expect(screen.getByText(/Deterministic Hash Computed/i)).toBeVisible();
    await screen.getByRole('button', { name: /Submit Work Claim/i }).click();
    await expect(screen.getByRole('heading', { name: /Work Claim Submitted Successfully/i })).toBeVisible();
    await expect(screen.getByText('PENDING REVIEW')).toBeVisible();
  });
});

