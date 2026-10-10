/**
 * Core Domain Types for TrustGraph
 * Source of Truth: TrustGraph Master Product Concept
 *
 * "Trust the evidence, not the profile."
 * CLAIM -> EVIDENCE -> ISSUER -> ATTESTATION -> CURRENT VALIDITY
 */

// Supported claim types (MVP target: developers and hackathon participants)
export type ClaimType =
  | 'CONTRACT_DEPLOYED'
  | 'CHALLENGE_COMPLETED'
  | 'CONTRIBUTION_VERIFIED';

// Discrete validity states (never an arbitrary reputation score or simple boolean)
export type ValidityStatus = 'VALID' | 'REVOKED' | 'EXPIRED' | 'INVALID_ISSUER';

// Off-chain evidence representation with cryptographic anchor
export interface Evidence {
  evidenceUrl: string;
  evidenceHash: `0x${string}`;
  canonicalPayload?: string;
  repositoryUrl?: string;
  deploymentAddress?: `0x${string}` | string;
  transactionHash?: `0x${string}` | string;
  demoUrl?: string;
  description?: string;
  verifiedLocally?: boolean;
}

// On-chain / Canonical Attestation record
export interface Attestation {
  id: string; // numeric string or bytes32 hex
  issuer: `0x${string}`;
  issuerName?: string;
  issuerRole?: string;
  issuerAuthorized: boolean;
  subject: `0x${string}`;
  subjectName?: string;
  claimType: ClaimType;
  claimTitle: string;
  claimDescription: string;
  evidenceHash: `0x${string}`;
  evidenceUrl: string;
  evidenceManifest?: string;
  issuedAt: number; // Unix timestamp in seconds or ms
  expiry: number; // 0 = perpetual, otherwise timestamp in seconds or ms
  revoked: boolean;
  revocationReason?: string;
  revokedAt?: number;
  transactionHash?: `0x${string}`;
  blockNumber?: number;
  validity: ValidityStatus;
  validityExplanation: string;
  isLiveOnChain?: boolean;
}

// Subject's Trust Profile
export interface TrustProfileStats {
  totalAttestations: number;
  validAttestations: number;
  revokedAttestations: number;
  expiredAttestations: number;
  invalidIssuerAttestations: number;
  byClaimType: Record<ClaimType, number>;
}

export interface TrustProfile {
  address: `0x${string}`;
  alias?: string;
  bio?: string;
  firstSeenAt?: number;
  stats: TrustProfileStats;
  attestations: Attestation[];
  trustedIssuers: IssuerProfile[];
}

// Authorized Issuer / Reviewer
export interface IssuerProfile {
  address: `0x${string}`;
  name: string;
  organization: string;
  role: string;
  isAuthorized: boolean;
  attestationsIssuedCount: number;
}

// Transaction tracking & metadata
export interface TransactionRecord {
  hash: `0x${string}`;
  chainId: number;
  from: `0x${string}`;
  to?: `0x${string}`;
  blockNumber?: number;
  timestamp?: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  method?: string;
  explorerUrl?: string;
}

// Backwards compatibility aliases
export type WorkType = ClaimType;
export type WorkStatus = ValidityStatus;
export type Work = Attestation;
export type WorkRecord = Attestation;
export type Passport = TrustProfile;
export type DeveloperPassport = TrustProfile;
export type Verifier = IssuerProfile;
export type VerifierProfile = IssuerProfile;
export type Transaction = TransactionRecord;
