/**
 * Automated test suite for TrustGraph verification logic & state transitions.
 * Conforms to AGENTS.md & Master Product Concept security testing requirements.
 */

import assert from 'node:assert';
import crypto from 'node:crypto';

// --- Cryptographic SHA-256 helper matching browser implementation ---
function computeSha256Node(content: string): `0x${string}` {
  const hash = crypto.createHash('sha256').update(content.trim()).digest('hex');
  return `0x${hash}`;
}

// --- Domain types & state machine simulator ---
type ClaimType = 'CONTRACT_DEPLOYED' | 'CHALLENGE_COMPLETED' | 'CONTRIBUTION_VERIFIED';
type ValidityStatus = 'VALID' | 'REVOKED' | 'EXPIRED' | 'INVALID_ISSUER';

interface AttestationRecord {
  id: string;
  issuer: string;
  subject: string;
  claimType: ClaimType;
  evidenceHash: `0x${string}`;
  evidenceUrl: string;
  issuedAt: number;
  expiry: number;
  revoked: boolean;
  revocationReason?: string;
}

class TrustGraphEngine {
  private authorizedIssuers = new Set<string>();
  private attestations = new Map<string, AttestationRecord>();
  private owner: string;
  private nextId = 1;

  constructor(owner: string) {
    this.owner = owner.toLowerCase();
    this.authorizedIssuers.add(this.owner);
  }

  approveIssuer(issuer: string, caller: string) {
    if (caller.toLowerCase() !== this.owner) {
      throw new Error('Only owner may approve issuer');
    }
    this.authorizedIssuers.add(issuer.toLowerCase());
  }

  removeIssuer(issuer: string, caller: string) {
    if (caller.toLowerCase() !== this.owner) {
      throw new Error('Only owner may remove issuer');
    }
    this.authorizedIssuers.delete(issuer.toLowerCase());
  }

  isIssuer(issuer: string): boolean {
    return this.authorizedIssuers.has(issuer.toLowerCase());
  }

  issueAttestation(input: {
    issuer: string;
    subject: string;
    claimType: ClaimType;
    evidenceHash: `0x${string}`;
    evidenceUrl: string;
    expiry: number;
  }): AttestationRecord {
    if (!this.isIssuer(input.issuer)) {
      throw new Error('Unauthorized issuer cannot issue attestations');
    }
    if (!input.evidenceHash || input.evidenceHash === '0x') {
      throw new Error('Evidence hash cannot be empty');
    }
    if (input.expiry !== 0 && input.expiry <= Math.floor(Date.now() / 1000)) {
      throw new Error('Expiry must be in the future');
    }

    const id = String(this.nextId++);
    const record: AttestationRecord = {
      id,
      issuer: input.issuer.toLowerCase(),
      subject: input.subject.toLowerCase(),
      claimType: input.claimType,
      evidenceHash: input.evidenceHash,
      evidenceUrl: input.evidenceUrl,
      issuedAt: Math.floor(Date.now() / 1000),
      expiry: input.expiry,
      revoked: false,
    };

    this.attestations.set(id, record);
    return record;
  }

  revokeAttestation(id: string, reason: string, caller: string) {
    const record = this.attestations.get(id);
    if (!record) {
      throw new Error('Attestation not found');
    }
    if (record.revoked) {
      throw new Error('Already revoked');
    }
    const normalizedCaller = caller.toLowerCase();
    if (normalizedCaller !== record.issuer && normalizedCaller !== this.owner) {
      throw new Error('Unauthorized revoke: only original issuer or owner can revoke');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Revocation reason is required');
    }

    record.revoked = true;
    record.revocationReason = reason.trim();
  }

  getValidity(id: string, currentTimeSec?: number): ValidityStatus {
    const record = this.attestations.get(id);
    if (!record) throw new Error('Not found');

    const now = currentTimeSec ?? Math.floor(Date.now() / 1000);

    if (record.revoked) return 'REVOKED';
    if (record.expiry !== 0 && now >= record.expiry) return 'EXPIRED';
    if (!this.isIssuer(record.issuer)) return 'INVALID_ISSUER';
    return 'VALID';
  }
}

// --- Test Execution ---
async function runTests() {
  console.log('🧪 Starting TrustGraph Security & Lifecycle Test Suite...\n');

  const OWNER = '0x72A14b98c368d19F58bFE4e7d4d4D91F2610A91F';
  const REVIEWER = '0x92Fa656bE0656D1F08a6eD7D284976d8b948F721';
  const SUBJECT = '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1';
  const ATTACKER = '0x6666666666666666666666666666666666666666';

  const engine = new TrustGraphEngine(OWNER);

  // 1. Evidence Hashing Determinism Test
  console.log('1. Testing Evidence Hashing Determinism...');
  const manifestA = 'Contract: 0x4386926019A8B74431eBDeF7c2718E340621B903\nChain: Monad Testnet (10143)';
  const hash1 = computeSha256Node(manifestA);
  const hash2 = computeSha256Node(manifestA);
  assert.strictEqual(hash1, hash2, 'Identical evidence manifests must yield identical SHA-256 hashes');

  const tamperedManifest = manifestA + ' (tampered)';
  const tamperedHash = computeSha256Node(tamperedManifest);
  assert.notStrictEqual(hash1, tamperedHash, 'Tampered evidence manifests must yield distinct hashes');
  console.log('   ✓ Deterministic hashing confirmed.');

  // 2. Issuer Authorization Management Test
  console.log('2. Testing Issuer Authorization & Access Control...');
  assert.strictEqual(engine.isIssuer(REVIEWER), false, 'Reviewer should not be authorized before owner approval');
  
  // Non-owner trying to approve issuer must fail
  assert.throws(
    () => engine.approveIssuer(REVIEWER, ATTACKER),
    /Only owner may approve issuer/,
    'Unauthorized caller cannot approve issuers'
  );

  // Owner approves reviewer
  engine.approveIssuer(REVIEWER, OWNER);
  assert.strictEqual(engine.isIssuer(REVIEWER), true, 'Reviewer should be authorized after owner approval');
  console.log('   ✓ Issuer authorization controls verified.');

  // 3. Attestation Issuance Test
  console.log('3. Testing Attestation Issuance...');
  // Unauthorized attacker trying to issue must fail
  assert.throws(
    () => engine.issueAttestation({
      issuer: ATTACKER,
      subject: SUBJECT,
      claimType: 'CONTRACT_DEPLOYED',
      evidenceHash: hash1,
      evidenceUrl: 'https://github.com/sarah/contract',
      expiry: 0,
    }),
    /Unauthorized issuer cannot issue attestations/,
    'Unauthorized caller cannot issue attestations'
  );

  // Authorized reviewer issues CONTRACT_DEPLOYED
  const att1 = engine.issueAttestation({
    issuer: REVIEWER,
    subject: SUBJECT,
    claimType: 'CONTRACT_DEPLOYED',
    evidenceHash: hash1,
    evidenceUrl: 'https://github.com/sarah/contract',
    expiry: 0,
  });

  assert.strictEqual(att1.id, '1');
  assert.strictEqual(engine.getValidity('1'), 'VALID');
  console.log('   ✓ Valid attestation issued and confirmed VALID.');

  // 4. Revocation Security & Preservation Test
  console.log('4. Testing Revocation Rules & Historical Preservation...');
  // Attacker cannot revoke
  assert.throws(
    () => engine.revokeAttestation('1', 'Malicious revoke', ATTACKER),
    /Unauthorized revoke/,
    'Attacker cannot revoke an attestation'
  );

  // Reviewer revokes with valid reason
  engine.revokeAttestation('1', 'Security audit found signature vulnerability', REVIEWER);
  assert.strictEqual(engine.getValidity('1'), 'REVOKED', 'Revoked attestation status must be REVOKED');

  // Double revocation must revert
  assert.throws(
    () => engine.revokeAttestation('1', 'Second revoke', REVIEWER),
    /Already revoked/,
    'Cannot revoke already-revoked attestation'
  );
  console.log('   ✓ Revocation rules and immutability enforced.');

  // 5. Expiry Validity Test
  console.log('5. Testing Time-Bounded Expiration...');
  const futureExpiry = Math.floor(Date.now() / 1000) + 1000;
  const att2 = engine.issueAttestation({
    issuer: REVIEWER,
    subject: SUBJECT,
    claimType: 'CHALLENGE_COMPLETED',
    evidenceHash: hash1,
    evidenceUrl: 'https://devpost.com/software/challenge',
    expiry: futureExpiry,
  });

  // Current time: before expiry -> VALID
  assert.strictEqual(engine.getValidity(att2.id, futureExpiry - 10), 'VALID');

  // Future time: after expiry -> EXPIRED
  assert.strictEqual(engine.getValidity(att2.id, futureExpiry + 10), 'EXPIRED');
  console.log('   ✓ Expiration calculation verified.');

  // 6. Issuer Removal Effects Test
  console.log('6. Testing Issuer Removal / De-Authorization...');
  const att3 = engine.issueAttestation({
    issuer: REVIEWER,
    subject: SUBJECT,
    claimType: 'CONTRIBUTION_VERIFIED',
    evidenceHash: hash1,
    evidenceUrl: 'https://github.com/monad/node/pull/1',
    expiry: 0,
  });
  assert.strictEqual(engine.getValidity(att3.id), 'VALID');

  // Owner removes reviewer privileges
  engine.removeIssuer(REVIEWER, OWNER);
  assert.strictEqual(engine.isIssuer(REVIEWER), false);

  // Attestation now reports INVALID_ISSUER because issuer authority was removed
  assert.strictEqual(engine.getValidity(att3.id), 'INVALID_ISSUER');
  console.log('   ✓ Issuer de-authorization propagation verified.');

  console.log('\n🎉 ALL TRUSTGRAPH VERIFICATION TESTS PASSED SUCCESSFULLY! (6/6)');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
