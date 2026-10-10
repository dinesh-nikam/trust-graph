import { Attestation, IssuerProfile, TrustProfile } from '../types';
import { DEMO_WALLETS } from '../lib/contract/config';

export const MOCK_ISSUERS: IssuerProfile[] = [
  {
    address: DEMO_WALLETS.REVIEWER.address,
    name: 'Monad Ecosystem Reviewer',
    organization: 'Monad Developer Network & Jury',
    role: 'Authorized Technical Issuer',
    isAuthorized: true,
    attestationsIssuedCount: 18,
  },
  {
    address: '0x5821F9c41E5C1Bf36D482De6C5a8F231D92c7104',
    name: 'Monad Hackathon Technical Jury',
    organization: 'Global Hackathon Syndicate',
    role: 'Hackathon Jury Lead',
    isAuthorized: true,
    attestationsIssuedCount: 24,
  },
  {
    address: '0x1111222233334444555566667777888899990000',
    name: 'De-Authorized Legacy Reviewer',
    organization: 'Former Audit Partner',
    role: 'Revoked Reviewer',
    isAuthorized: false,
    attestationsIssuedCount: 3,
  },
];

export const MOCK_ATTESTATIONS: Attestation[] = [
  // 1. CONTRACT_DEPLOYED (VALID)
  {
    id: '1',
    issuer: DEMO_WALLETS.REVIEWER.address,
    issuerName: 'Monad Ecosystem Reviewer',
    issuerRole: 'Authorized Technical Issuer',
    issuerAuthorized: true,
    subject: DEMO_WALLETS.DEVELOPER.address,
    subjectName: 'Developer Sarah',
    claimType: 'CONTRACT_DEPLOYED',
    claimTitle: 'High-Throughput Streaming Payment Contract',
    claimDescription:
      'Deployed gas-optimized token streaming & batch disbursement contract on Monad Testnet with full execution test coverage.',
    evidenceUrl: 'https://github.com/sarah-dev/monad-stream-pay',
    evidenceHash: '0x9a7574dcdfbcce09175d2937f113873dade598cff6b2051c716d11b7d79d00a5',
    evidenceManifest:
      'Repo: https://github.com/sarah-dev/monad-stream-pay\nContract: 0x4386926019A8B74431eBDeF7c2718E340621B903\nChain: Monad Testnet (10143)\nBytecode verified against git commit 7c89f2a',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 4,
    expiry: 0, // Perpetual
    revoked: false,
    validity: 'VALID',
    validityExplanation:
      'Attestation is active. Reviewer is authorized on Monad testnet registry. Contract has no expiration and has not been revoked.',
          },

  // 2. CHALLENGE_COMPLETED (VALID)
  {
    id: '2',
    issuer: '0x5821F9c41E5C1Bf36D482De6C5a8F231D92c7104',
    issuerName: 'Monad Hackathon Technical Jury',
    issuerRole: 'Hackathon Jury Lead',
    issuerAuthorized: true,
    subject: DEMO_WALLETS.DEVELOPER.address,
    subjectName: 'Developer Sarah',
    claimType: 'CHALLENGE_COMPLETED',
    claimTitle: 'Monad Madness DeFi Track: 10k TPS Benchmark Winner',
    claimDescription:
      'Architected parallelized AMM order routing contract achieving sub-400ms inclusion and zero state collisions across 1,000 parallel test transfers.',
    evidenceUrl: 'https://devpost.com/software/monad-parallel-amm',
    evidenceHash: '0x72b1cccb70ea829072ee8c4bc9bca0043b3c47357af7e4cada1c2d6bce1c278f',
    evidenceManifest:
      'Hackathon: Monad Global Hackathon 2026\nSubmission: https://devpost.com/software/monad-parallel-amm\nJury Score: 98/100\nIndependent Benchmark: Pass',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 12,
    expiry: 0,
    revoked: false,
    validity: 'VALID',
    validityExplanation:
      'Attestation is active. Jury issuer holds valid registry authority. Evidence manifest benchmark passed.',
          },

  // 3. CONTRIBUTION_VERIFIED (VALID)
  {
    id: '3',
    issuer: DEMO_WALLETS.REVIEWER.address,
    issuerName: 'Monad Ecosystem Reviewer',
    issuerRole: 'Authorized Technical Issuer',
    issuerAuthorized: true,
    subject: DEMO_WALLETS.DEVELOPER.address,
    subjectName: 'Developer Sarah',
    claimType: 'CONTRIBUTION_VERIFIED',
    claimTitle: 'Async Storage Pre-warming Patch in Core Node Client',
    claimDescription:
      'Authored upstream pull request optimizing cold state disk reads by 32% under synthetic Monad testnet benchmark load.',
    evidenceUrl: 'https://github.com/monad-developers/node/pull/482',
    evidenceHash: '0x78176ec7dc8810e6ff4471dd7684e0cbf84e87dfcb2d68728c97b9fced0e13dd',
    evidenceManifest:
      'PR: https://github.com/monad-developers/node/pull/482\nCommit: a812f04e1984\nMerged by core maintainer: yes',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 20,
    expiry: 0,
    revoked: false,
    validity: 'VALID',
    validityExplanation:
      'Attestation is active. Issuer reviewed merged PR and tested reproducibility.',
          },

  // 4. REVOKED SAMPLE (Intentionally Revoked)
  {
    id: '4',
    issuer: DEMO_WALLETS.REVIEWER.address,
    issuerName: 'Monad Ecosystem Reviewer',
    issuerRole: 'Authorized Technical Issuer',
    issuerAuthorized: true,
    subject: DEMO_WALLETS.DEVELOPER.address,
    subjectName: 'Developer Sarah',
    claimType: 'CONTRACT_DEPLOYED',
    claimTitle: 'Legacy Multi-Token Bridge Adapter v1 (Revoked)',
    claimDescription:
      'Cross-chain message verification adapter. Revoked after security audit revealed vulnerable signature malleability.',
    evidenceUrl: 'https://github.com/sarah-dev/legacy-bridge-adapter',
    evidenceHash: '0x958cffdc44273de1dfbb8468f2d749c6a03e3b25de01ca7cb11c2dad90b2bb7f',
    evidenceManifest:
      'Repo: https://github.com/sarah-dev/legacy-bridge-adapter\nContract: 0x1111111111111111111111111111111111111111\nAudit status: Vulnerability identified post-verification',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 45,
    expiry: 0,
    revoked: true,
    revocationReason:
      'Security audit identified signature verification flaw; contract deprecated and replaced by secure v2 implementation.',
    revokedAt: Math.floor(Date.now() / 1000) - 86400 * 5,
    validity: 'REVOKED',
    validityExplanation:
      'This attestation was explicitly revoked on-chain by the issuing reviewer. The historical record is preserved, but the claim no longer stands.',
          },

  // 5. EXPIRED SAMPLE (Expired Attestation)
  {
    id: '5',
    issuer: '0x5821F9c41E5C1Bf36D482De6C5a8F231D92c7104',
    issuerName: 'Monad Hackathon Technical Jury',
    issuerRole: 'Hackathon Jury Lead',
    issuerAuthorized: true,
    subject: DEMO_WALLETS.DEVELOPER.address,
    subjectName: 'Developer Sarah',
    claimType: 'CHALLENGE_COMPLETED',
    claimTitle: 'Quarterly Infrastructure Testnet Validator Sprint',
    claimDescription:
      'Time-bounded 30-day validator node uptime and block production stress test participant.',
    evidenceUrl: 'https://telemetry.monad.xyz/node/sarah-node-01',
    evidenceHash: '0xea0d3d52991454869bb6bd3eb5febdef4c41811a778db5b743254af2179cc87e',
    evidenceManifest:
      'Sprint: Q1 Testnet Sprint\nUptime: 99.8%\nExpiry Policy: 30 days post-sprint completion',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 90,
    expiry: Math.floor(Date.now() / 1000) - 86400 * 60, // Expired 60 days ago
    revoked: false,
    validity: 'EXPIRED',
    validityExplanation:
      'This attestation was time-bounded and has passed its registered expiration timestamp.',
          },

  // 6. Alex / Developer 2 Sample
  {
    id: '6',
    issuer: DEMO_WALLETS.REVIEWER.address,
    issuerName: 'Monad Ecosystem Reviewer',
    issuerRole: 'Authorized Technical Issuer',
    issuerAuthorized: true,
    subject: '0x72A14b98c368d19F58bFE4e7d4d4D91F2610A91F',
    subjectName: 'Developer Alex (Organizer)',
    claimType: 'CONTRACT_DEPLOYED',
    claimTitle: 'Core TrustGraph Registry Deployment & Factory',
    claimDescription:
      'Original creator and deployer of the TrustGraph on-chain verification registry on Monad testnet.',
    evidenceUrl: 'https://testnet.monadexplorer.com/address/0x4386926019A8B74431eBDeF7c2718E340621B903',
    evidenceHash: '0x03a6238fdd71389a233e664250311d9f2a1dcb18d543eaa004ef0e42060d34ba',
    evidenceManifest:
      'Contract: 0x4386926019A8B74431eBDeF7c2718E340621B903\nVerified Compiler: Solidity 0.8.20',
    issuedAt: Math.floor(Date.now() / 1000) - 86400 * 60,
    expiry: 0,
    revoked: false,
    validity: 'VALID',
    validityExplanation:
      'Verified contract deployment on Monad testnet with matching bytecode hash.',
          },
];

export function getProfileForAddress(rawAddress: string): TrustProfile {
  const addr = rawAddress.toLowerCase();
  const attestations = MOCK_ATTESTATIONS.filter(
    (a) => a.subject.toLowerCase() === addr
  );

  const byClaimType = {
    CONTRACT_DEPLOYED: attestations.filter((a) => a.claimType === 'CONTRACT_DEPLOYED').length,
    CHALLENGE_COMPLETED: attestations.filter((a) => a.claimType === 'CHALLENGE_COMPLETED').length,
    CONTRIBUTION_VERIFIED: attestations.filter((a) => a.claimType === 'CONTRIBUTION_VERIFIED').length,
  };

  const validCount = attestations.filter((a) => a.validity === 'VALID').length;
  const revokedCount = attestations.filter((a) => a.validity === 'REVOKED').length;
  const expiredCount = attestations.filter((a) => a.validity === 'EXPIRED').length;
  const invalidIssuerCount = attestations.filter((a) => a.validity === 'INVALID_ISSUER').length;

  let alias = 'Developer Profile';
  let bio = 'Monad Ecosystem Builder';

  if (addr === DEMO_WALLETS.DEVELOPER.address.toLowerCase()) {
    alias = 'Sarah (Demo Builder)';
    bio = 'Full-stack Web3 engineer specializing in Monad high-throughput EVM smart contracts.';
  } else if (addr === DEMO_WALLETS.ORGANIZER.address.toLowerCase()) {
    alias = 'Alex (Organizer / Admin)';
    bio = 'TrustGraph Registry administrator and core infrastructure developer.';
  } else if (addr === DEMO_WALLETS.REVIEWER.address.toLowerCase()) {
    alias = 'Reviewer Guild';
    bio = 'Authorized technical jury and reviewer guild on Monad.';
  }

  return {
    address: (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`,
    alias,
    bio,
    firstSeenAt: attestations.length > 0 ? attestations[attestations.length - 1].issuedAt : Date.now(),
    stats: {
      totalAttestations: attestations.length,
      validAttestations: validCount,
      revokedAttestations: revokedCount,
      expiredAttestations: expiredCount,
      invalidIssuerAttestations: invalidIssuerCount,
      byClaimType,
    },
    attestations,
    trustedIssuers: MOCK_ISSUERS.filter((iss) =>
      attestations.some((a) => a.issuer.toLowerCase() === iss.address.toLowerCase())
    ),
  };
}

// Backwards compatibility exports
export const MOCK_WORKS = MOCK_ATTESTATIONS;
export const MOCK_VERIFIERS = MOCK_ISSUERS;
export const MOCK_PASSPORTS: Record<string, TrustProfile> = {
  [DEMO_WALLETS.DEVELOPER.address]: getProfileForAddress(DEMO_WALLETS.DEVELOPER.address),
  [DEMO_WALLETS.ORGANIZER.address]: getProfileForAddress(DEMO_WALLETS.ORGANIZER.address),
};
