import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

describe('TrustGraph E2E Suite', () => {
  test('homepage renders hero heading and registry overview', async ({ app, screen }) => {
    await app.open('/');
    await expect(screen.getByRole('heading', { level: 1 })).toContainText('Trust the evidence');
    await expect(screen.getByText('TrustGraph • Monad Verification Registry')).toBeVisible();
    await expect(screen.getByPlaceholder('Search wallet (0x...) or Claim #1')).toBeVisible();
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
    await expect(screen.getByText('PUBLIC INSPECTION VIEW')).toBeVisible();
  });

  test('issue attestation portal displays form controls', async ({ app, screen, browser }) => {
    await app.open('/issue');
    await expect(browser).toHaveURL('/issue');
    await expect(screen.getByRole('heading', { level: 1 })).toHaveText('Issue Evidence-Backed Attestation');
    await expect(screen.getByText('AUTHORIZED ISSUER PORTAL')).toBeVisible();
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
    await expect(screen.getByText('AUTHORIZED ISSUER')).toBeVisible();
  });

  test('trust graph page visualizes attestation network', async ({ app, screen, browser }) => {
    const devAddress = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';
    await app.open(`/graph/${devAddress}`);
    await expect(browser).toHaveURL(`/graph/${devAddress}`);
    await expect(screen.getByRole('heading', { name: 'Trust Graph: Sarah (Demo Builder)' })).toBeVisible();
    await expect(screen.getByText('GRAPH EXPLORER')).toBeVisible();
  });
});
