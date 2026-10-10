import { ClaimType, ValidityStatus, WorkStatus, WorkType } from '../types';

export function shortenAddress(address?: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function shortenHash(hash?: string, chars = 6): string {
  if (!hash) return '';
  if (hash.length <= chars * 2 + 2) return hash;
  return `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  // Check if timestamp is in seconds vs milliseconds
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '—';
  const ms = timestamp < 1e11 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getClaimTypeDetails(type: ClaimType | string) {
  switch (type) {
    case 'CONTRACT_DEPLOYED':
    case 'SMART_CONTRACT':
      return {
        label: 'Contract Deployed',
        shortLabel: 'Contract',
        code: 'CONTRACT_DEPLOYED' as ClaimType,
        tagBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        description: 'Verified on-chain smart contract deployment on Monad testnet.',
      };
    case 'CHALLENGE_COMPLETED':
    case 'HACKATHON_PROJECT':
      return {
        label: 'Challenge Completed',
        shortLabel: 'Challenge',
        code: 'CHALLENGE_COMPLETED' as ClaimType,
        tagBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        description: 'Completed technical challenge or hackathon milestone reviewed by jury.',
      };
    case 'CONTRIBUTION_VERIFIED':
    case 'GITHUB_CONTRIBUTION':
    default:
      return {
        label: 'Contribution Verified',
        shortLabel: 'Contribution',
        code: 'CONTRIBUTION_VERIFIED' as ClaimType,
        tagBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        description: 'Reviewed open-source repository commit, PR, or architectural patch.',
      };
  }
}

export const getWorkTypeDetails = getClaimTypeDetails;

export function getValidityDetails(status: ValidityStatus | WorkStatus | string) {
  switch (status) {
    case 'VALID':
    case 'VERIFIED':
      return {
        label: 'VALID',
        symbol: '✓',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dotClass: 'bg-emerald-400',
        textClass: 'text-emerald-400',
        explanation: 'Attestation is active, issuer is authorized, and proof has not expired or been revoked.',
      };
    case 'REVOKED':
      return {
        label: 'REVOKED',
        symbol: '⊘',
        badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dotClass: 'bg-rose-400',
        textClass: 'text-rose-400',
        explanation: 'Attestation was explicitly revoked by the issuer or registry admin and is no longer valid.',
      };
    case 'EXPIRED':
      return {
        label: 'EXPIRED',
        symbol: '⏳',
        badgeClass: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
        dotClass: 'bg-neutral-400',
        textClass: 'text-neutral-400',
        explanation: 'Attestation exceeded its recorded validity timeframe.',
      };
    case 'INVALID_ISSUER':
      return {
        label: 'INVALID ISSUER',
        symbol: '⚠️',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-400',
        explanation: 'Issuer authorization has been removed from the TrustGraph registry.',
      };
    case 'EVIDENCE_MISMATCH':
      return {
        label: 'EVIDENCE MISMATCH',
        symbol: '✕',
        badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
        dotClass: 'bg-red-400',
        textClass: 'text-red-400',
        explanation: 'Calculated hash of presented evidence does NOT match the on-chain recorded hash.',
      };
    case 'NOT_FOUND':
      return {
        label: 'NOT FOUND',
        symbol: '?',
        badgeClass: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
        dotClass: 'bg-neutral-500',
        textClass: 'text-neutral-400',
        explanation: 'Attestation does not exist on the TrustGraph registry.',
      };
    case 'UNKNOWN':
      return {
        label: 'UNKNOWN',
        symbol: '?',
        badgeClass: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30',
        dotClass: 'bg-neutral-500',
        textClass: 'text-neutral-400',
        explanation: 'Validity state cannot be determined or verified.',
      };
    case 'PENDING':
    default:
      return {
        label: 'PENDING',
        symbol: '⏳',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-400',
        explanation: 'Attestation submission is awaiting reviewer transaction confirmation.',
      };
  }
}

export const getStatusDetails = getValidityDetails;

/**
 * Computes deterministic SHA-256 hash using native browser subtle crypto API
 */
export async function computeSha256(content: string): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hashHex}`;
}

/**
 * Encodes an ASCII/UTF-8 string into a bytes32 hex string
 */
export function stringToBytes32(str: string): `0x${string}` {
  let hex = '';
  for (let i = 0; i < str.length && i < 32; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return `0x${hex.padEnd(64, '0')}`;
}

/**
 * Decodes bytes32 hex string to clean ASCII string
 */
export function bytes32ToString(bytes32Hex: string): string {
  if (!bytes32Hex || !bytes32Hex.startsWith('0x')) return bytes32Hex;
  let hex = bytes32Hex.slice(2);
  let str = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}
