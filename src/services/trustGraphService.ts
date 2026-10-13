import { createPublicClient, http, isAddress } from 'viem';
import { Attestation, ClaimType, IssuerProfile, TrustProfile, ValidityStatus, WorkSubmission } from '../types';
import { 
  CONTRACT_CONFIG, 
  DEMO_WALLETS, 
  MONAD_TESTNET_CHAIN_ID, 
  TRUST_GRAPH_REGISTRY_ADDRESS, 
  REGISTRY_ADDRESS_CONFIGURED, 
  monadTestnet 
} from '../lib/contract/config';
import { bytes32ToString, computeSha256 } from '../utils/formatters';
import { MOCK_ATTESTATIONS, MOCK_ISSUERS, getProfileForAddress } from '../data/mockData';
import { api } from './api';


const STORAGE_KEY = 'trustgraph_attestations_v2';
const STORAGE_ISSUERS_KEY = 'trustgraph_issuers_v2';
const STORAGE_MODE_KEY = 'trustgraph_mode_v2';
const STORAGE_SUBMISSIONS_KEY = 'trustgraph_submissions_v2';

const SEED_SUBMISSIONS: WorkSubmission[] = [
  {
    id: 'sub-1',
    worker: DEMO_WALLETS.DEVELOPER.address,
    claimType: 'CONTRACT_DEPLOYED',
    title: 'Monad High-Throughput DEX Router',
    description: 'Deployed and verified parallel swap router contract on Monad Testnet with sub-second execution.',
    evidenceUrl: 'https://testnet.monadexplorer.com/address/0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1',
    evidenceManifest: 'Contract: MonadDEXRouter\nNetwork: Monad Testnet (10143)\nOptimization: Parallel storage pre-warming',
    evidenceHash: '0x4486926019A8B74431eBDeF7c2718E340621B903112233445566778899aabbcc',
    submittedAt: Math.floor(Date.now() / 1000) - 3600 * 4,
    status: 'PENDING',
  },
  {
    id: 'sub-2',
    worker: DEMO_WALLETS.DEVELOPER.address,
    claimType: 'CHALLENGE_COMPLETED',
    title: 'Monad Madness Parallel State Merkle Tree Benchmark',
    description: 'Achieved 10,000 TPS under async execution simulator reproducing zero state conflict benchmarks.',
    evidenceUrl: 'https://devpost.com/software/monad-parallel-amm',
    evidenceManifest: 'Hackathon: Monad Global Hackathon 2026\nBenchmark: 10,000 TPS on Monad EVM\nReproducibility: Confirmed',
    evidenceHash: '0x72b1cccb70ea829072ee8c4bc9bca0043b3c47357af7e4cada1c2d6bce1c278f',
    submittedAt: Math.floor(Date.now() / 1000) - 3600 * 18,
    status: 'PENDING',
  },
  {
    id: 'sub-3',
    worker: DEMO_WALLETS.DEVELOPER.address,
    claimType: 'CONTRIBUTION_VERIFIED',
    title: 'EIP-7702 Delegation Auth Validator Patch for Monad Node',
    description: 'Upstream pull request implementing gas-efficient account abstraction authorization verification.',
    evidenceUrl: 'https://github.com/monad-developers/node/pull/482',
    evidenceManifest: 'PR: https://github.com/monad-developers/node/pull/482\nCommit: a812f04e1984\nMerged: yes',
    evidenceHash: '0x78176ec7dc8810e6ff4471dd7684e0cbf84e87dfcb2d68728c97b9fced0e13dd',
    submittedAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    status: 'PENDING',
  },
];

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
});

const claimTypes: ClaimType[] = [
  'CONTRACT_DEPLOYED',
  'CHALLENGE_COMPLETED',
  'CONTRIBUTION_VERIFIED',
];

const validityByCode: ValidityStatus[] = [
  'NOT_FOUND',
  'VALID',
  'REVOKED',
  'EXPIRED',
  'INVALID_ISSUER',
];

function decodeClaimType(value: string): ClaimType {
  const decoded = bytes32ToString(value);
  if (!claimTypes.includes(decoded as ClaimType)) throw new Error(`Registry returned unsupported claim type: ${decoded}`);
  return decoded as ClaimType;
}

function validityExplanation(status: ValidityStatus, expiry: number, reason?: string): string {
  switch (status) {
    case 'VALID':
      return 'The registry reports this attestation as currently valid.';
    case 'REVOKED':
      return reason ? `Revoked: ${reason}` : 'The registry reports this attestation as revoked.';
    case 'EXPIRED':
      return `Expired at ${new Date(expiry * 1000).toISOString()}.`;
    case 'INVALID_ISSUER':
      return 'The issuer is no longer authorized by the registry.';
    case 'NOT_FOUND':
      return 'No attestation with this ID exists in the registry.';
    default:
      return 'The registry did not return a recognized validity state.';
  }
}

class TrustGraphService {
  private demoAttestations: Attestation[] = [...MOCK_ATTESTATIONS];
  private demoIssuers: IssuerProfile[] = [...MOCK_ISSUERS];
  private submissions: WorkSubmission[] = [...SEED_SUBMISSIONS];
  private isLiveMode = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      const storedMode = localStorage.getItem(STORAGE_MODE_KEY);
      const envMode = import.meta.env.VITE_APP_MODE as string | undefined;
      if (storedMode === 'LIVE' || storedMode === 'DEMO') {
        this.isLiveMode = storedMode === 'LIVE';
      } else if (envMode) {
        this.isLiveMode = envMode.toLowerCase() !== 'demo';
      } else {
        this.isLiveMode = true;
      }

      const storedAttestations = localStorage.getItem(STORAGE_KEY);
      if (storedAttestations) {
        this.demoAttestations = JSON.parse(storedAttestations);
      }

      const storedIssuers = localStorage.getItem(STORAGE_ISSUERS_KEY);
      if (storedIssuers) {
        this.demoIssuers = JSON.parse(storedIssuers);
      }

      const storedSubmissions = localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (storedSubmissions) {
        this.submissions = JSON.parse(storedSubmissions);
      }
    } catch {
      this.isLiveMode = import.meta.env.VITE_APP_MODE?.toLowerCase() !== 'demo';
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.demoAttestations));
      localStorage.setItem(STORAGE_ISSUERS_KEY, JSON.stringify(this.demoIssuers));
      localStorage.setItem(STORAGE_MODE_KEY, this.isLiveMode ? 'LIVE' : 'DEMO');
      localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(this.submissions));
    } catch (e) {
      console.warn('Failed to persist TrustGraph state:', e);
    }
  }

  public getMode(): 'LIVE' | 'DEMO' {
    return this.isLiveMode ? 'LIVE' : 'DEMO';
  }

  public setMode(mode: 'LIVE' | 'DEMO'): void {
    this.isLiveMode = mode === 'LIVE';
    this.save();
    window.dispatchEvent(new Event('storage'));
  }

  /**
   * Check if contract has bytecode on Monad Testnet
   */
  public async hasContractBytecode(): Promise<boolean> {
    if (!REGISTRY_ADDRESS_CONFIGURED) return false;
    const chainId = await publicClient.getChainId();
    if (chainId !== MONAD_TESTNET_CHAIN_ID) return false;
    const bytecode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
    return Boolean(bytecode && bytecode !== '0x');
  }

  private async assertRegistryAvailable(): Promise<void> {
    if (!REGISTRY_ADDRESS_CONFIGURED) {
      throw new Error('Registry address is not configured. Live registry reads are unavailable.');
    }
    const chainId = await publicClient.getChainId();
    if (chainId !== MONAD_TESTNET_CHAIN_ID) {
      throw new Error(`Registry RPC returned chain ID ${chainId}; expected Monad Testnet (${MONAD_TESTNET_CHAIN_ID}).`);
    }
    const bytecode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
    if (!bytecode || bytecode === '0x') {
      throw new Error('No registry contract is deployed at the configured Monad Testnet address.');
    }
  }

  public async getRegistryOwner(): Promise<`0x${string}`> {
    await this.assertRegistryAvailable();
    return publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'owner' });
  }

  private async readOnChainAttestation(id: string): Promise<Attestation | null> {
    if (!/^\d+$/.test(id) || BigInt(id) < 1n) return null;
    const numericId = BigInt(id);

    await this.assertRegistryAvailable();

      const statusCode = await publicClient.readContract({
        ...CONTRACT_CONFIG,
        functionName: 'getValidityStatus',
        args: [numericId],
      });
      const validity = validityByCode[Number(statusCode)] ?? 'UNKNOWN';
      if (validity === 'NOT_FOUND') return null;

      const record = await publicClient.readContract({
        ...CONTRACT_CONFIG,
        functionName: 'getAttestation',
        args: [numericId],
      });
      const issuerAuthorized = await publicClient.readContract({
        ...CONTRACT_CONFIG,
        functionName: 'isIssuer',
        args: [record.issuer],
      });

      const expiry = Number(record.expiry);
      const claimType = decodeClaimType(record.claimType);
      const reason = record.revocationReason || undefined;
      const idStr = numericId.toString();

      return {
        id: idStr,
        issuer: record.issuer,
        issuerName: record.issuer,
        issuerRole: 'Registry issuer',
        issuerAuthorized,
        subject: record.subject,
        claimType,
        claimTitle: claimType,
        claimDescription: 'The contract does not store a claim title or description.',
        evidenceHash: record.evidenceHash,
        evidenceUrl: record.evidenceUri,
        issuedAt: Number(record.issuedAt),
        expiry,
        revoked: record.revoked,
        revocationReason: reason,
        validity,
        validityExplanation: validityExplanation(validity, expiry, reason),
        isLiveOnChain: true,
      };
  }

  private async readOnChainAttestationsBatch(ids: bigint[]): Promise<Attestation[]> {
    if (ids.length === 0) return [];
    await this.assertRegistryAvailable();

    try {
      // 1. Fetch all attestation structs in batch chunks of 50
      const CHUNK_SIZE = 50;
      const chunks: bigint[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + CHUNK_SIZE));
      }

      const rawAttestationBatches = await Promise.all(
        chunks.map((chunk) =>
          publicClient.readContract({
            ...CONTRACT_CONFIG,
            functionName: 'getAttestations',
            args: [chunk],
          })
        )
      );

      const allRecords = rawAttestationBatches.flat();
      const validRecords = allRecords.filter((r) => r.issuedAt !== 0n);
      if (validRecords.length === 0) return [];

      // 2. Multicall validity status for all valid records in 1 round trip
      const validityResults = await publicClient.multicall({
        contracts: validRecords.map((r) => ({
          ...CONTRACT_CONFIG,
          functionName: 'getValidityStatus',
          args: [r.id],
        })),
        allowFailure: true,
      });

      // 3. Multicall unique issuer authorizations in 1 round trip
      const uniqueIssuers = [...new Set(validRecords.map((r) => r.issuer.toLowerCase()))];
      const issuerResults = await publicClient.multicall({
        contracts: uniqueIssuers.map((issuer) => ({
          ...CONTRACT_CONFIG,
          functionName: 'isIssuer',
          args: [issuer as `0x${string}`],
        })),
        allowFailure: true,
      });

      const issuerAuthMap = new Map<string, boolean>();
      uniqueIssuers.forEach((issuer, index) => {
        const res = issuerResults[index];
        issuerAuthMap.set(issuer, res?.status === 'success' ? Boolean(res.result) : false);
      });

      // 4. Assemble Attestation objects
      return validRecords.map((record, index) => {
        const valRes = validityResults[index];
        const statusCode = valRes?.status === 'success' ? Number(valRes.result) : 0;
        const validity = validityByCode[statusCode] ?? 'UNKNOWN';
        const issuerAuthorized = issuerAuthMap.get(record.issuer.toLowerCase()) ?? false;
        const expiry = Number(record.expiry);
        const claimType = decodeClaimType(record.claimType);
        const reason = record.revocationReason || undefined;

        return {
          id: record.id.toString(),
          issuer: record.issuer,
          issuerName: record.issuer,
          issuerRole: 'Registry issuer',
          issuerAuthorized,
          subject: record.subject,
          claimType,
          claimTitle: claimType,
          claimDescription: 'The contract does not store a claim title or description.',
          evidenceHash: record.evidenceHash,
          evidenceUrl: record.evidenceUri,
          issuedAt: Number(record.issuedAt),
          expiry,
          revoked: record.revoked,
          revocationReason: reason,
          validity,
          validityExplanation: validityExplanation(validity, expiry, reason),
          isLiveOnChain: true,
        };
      });
    } catch (batchErr) {
      // Graceful fallback to individual reads if contract version lacks batch methods
      console.warn('Batch attestations read fallback to individual reads:', batchErr);
      const records = await Promise.all(ids.map((id) => this.readOnChainAttestation(id.toString())));
      return records.filter((r): r is Attestation => r !== null);
    }
  }

  public async getAttestationById(id: string): Promise<Attestation | null> {
    if (this.isLiveMode) {
      // 1. If numeric ID, check on-chain registry first
      if (/^\d+$/.test(id)) {
        const onChain = await this.readOnChainAttestation(id);
        if (onChain) {
          // Attempt to enrich with off-chain manifest from MongoDB if available
          try {
            const mongoRes = await api.submissions.getPublic();
            if (mongoRes.success && Array.isArray(mongoRes.submissions)) {
              const matched = mongoRes.submissions.find(
                (s) =>
                  s.evidenceHash?.toLowerCase() === onChain.evidenceHash?.toLowerCase() ||
                  s.workId?.toLowerCase() === onChain.id.toLowerCase()
              );
              if (matched) {
                onChain.claimTitle = matched.title || onChain.claimTitle;
                onChain.claimDescription = matched.description || onChain.claimDescription;
                onChain.evidenceManifest = matched.evidenceManifest || onChain.evidenceManifest;
              }
            }
          } catch {
            // Keep onChain as is
          }
          return onChain;
        }
      }

      // 2. Query MongoDB by workId or mongo _id
      try {
        const mongoRes = await api.submissions.getById(id);
        if (mongoRes.success && mongoRes.submission) {
          const s = mongoRes.submission;
          return {
            id: s.workId || s._id,
            issuer: (s.reviewedBy as `0x${string}`) || DEMO_WALLETS.REVIEWER.address,
            issuerName: s.reviewedBy ? 'Authorized Verifier' : 'Pending Verification',
            issuerRole: 'Verifier',
            issuerAuthorized: !!s.reviewedBy,
            subject: s.subjectAddress as `0x${string}`,
            claimType: (s.workType as ClaimType) || 'CONTRACT_DEPLOYED',
            claimTitle: s.title,
            claimDescription: s.description,
            evidenceHash: s.evidenceHash as `0x${string}`,
            evidenceUrl: s.evidenceUrl,
            evidenceManifest: s.evidenceManifest,
            issuedAt: Math.floor(new Date(s.createdAt).getTime() / 1000),
            expiry: 0,
            revoked: s.status === 'REJECTED' || s.status === 'REVOKED',
            revocationReason: s.statusReason,
            validity: s.status === 'VERIFIED' ? 'VALID' : s.status === 'REJECTED' || s.status === 'REVOKED' ? 'REVOKED' : 'PENDING',
            validityExplanation:
              s.status === 'VERIFIED'
                ? 'Work verified in TrustGraph registry.'
                : s.status === 'REJECTED'
                ? `Rejected: ${s.statusReason || 'Requirements not met'}`
                : 'Pending reviewer verification.',
            isLiveOnChain: !!s.transactionHash,
          };
        }
      } catch {
        // Not found in MongoDB
      }

      return null;
    }

    // Demo records and submissions are available only in explicit DEMO mode.
    if (id.startsWith('0x') && id.length === 66) {
      const subMatch = this.submissions.find((s) => s.id.toLowerCase() === id.toLowerCase());
      if (subMatch) {
        return {
          id: subMatch.id,
          issuer: DEMO_WALLETS.REVIEWER.address,
          issuerName: 'Authorized Verifier',
          issuerRole: 'Reviewer',
          issuerAuthorized: true,
          subject: subMatch.worker,
          claimType: subMatch.claimType,
          claimTitle: subMatch.title,
          claimDescription: subMatch.description,
          evidenceHash: subMatch.evidenceHash,
          evidenceUrl: subMatch.evidenceUrl,
          evidenceManifest: subMatch.evidenceManifest,
          issuedAt: subMatch.submittedAt,
          expiry: 0,
          revoked: subMatch.status === 'REJECTED',
          revocationReason: subMatch.rejectionReason,
          validity: subMatch.status === 'APPROVED' ? 'VALID' : subMatch.status === 'REJECTED' ? 'REVOKED' : 'PENDING',
          validityExplanation:
            subMatch.status === 'APPROVED'
              ? 'Work approved by verifier.'
              : subMatch.status === 'REJECTED'
              ? `Rejected: ${subMatch.rejectionReason}`
              : 'Pending reviewer verification.',
          isLiveOnChain: false,
        };
      }
    }

    // Demo records are available only when DEMO mode is explicitly selected.
    const found = this.demoAttestations.find((a) => a.id.toLowerCase() === id.toLowerCase());
    if (!found) return null;

    return this.evaluateValidity(found);
  }

  public async getAllAttestations(): Promise<Attestation[]> {
    if (this.isLiveMode) {
      await this.assertRegistryAvailable();
      const ids = await publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'getAllAttestationIds' });
      const records = await this.readOnChainAttestationsBatch(ids as bigint[]);
      return records.sort((a, b) => b.issuedAt - a.issuedAt);
    }
    return [...this.demoAttestations];
  }

  public async getProfile(rawAddress: string): Promise<TrustProfile> {
    const subject = (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`;

    if (this.isLiveMode) {
      if (!isAddress(subject)) throw new Error('Enter a valid EVM wallet address.');
      await this.assertRegistryAvailable();
      const ids = await publicClient.readContract({
        ...CONTRACT_CONFIG,
        functionName: 'getAttestationsBySubject',
        args: [subject],
      });
      const onChainAttestations = (await this.readOnChainAttestationsBatch(ids as bigint[]))
        .sort((a, b) => b.issuedAt - a.issuedAt);

      // Query MongoDB submissions for this subject to retrieve off-chain evidence manifests
      let mongoAttestations: Attestation[] = [];
      try {
        const mongoRes = await api.submissions.getPublic({ address: subject });
        if (mongoRes.success && Array.isArray(mongoRes.submissions)) {
          mongoAttestations = mongoRes.submissions
            .filter((ms) => !onChainAttestations.some((oa) => oa.evidenceHash?.toLowerCase() === ms.evidenceHash?.toLowerCase()))
            .map((ms): Attestation => ({
              id: ms.workId || ms._id,
              issuer: (ms.reviewedBy as `0x${string}`) || DEMO_WALLETS.REVIEWER.address,
              issuerName: ms.reviewedBy ? 'Authorized Verifier' : 'Pending Verification',
              issuerRole: 'Verifier',
              issuerAuthorized: !!ms.reviewedBy,
              subject: ms.subjectAddress as `0x${string}`,
              claimType: (ms.workType as ClaimType) || 'CONTRACT_DEPLOYED',
              claimTitle: ms.title,
              claimDescription: ms.description,
              evidenceHash: ms.evidenceHash as `0x${string}`,
              evidenceUrl: ms.evidenceUrl,
              evidenceManifest: ms.evidenceManifest,
              issuedAt: Math.floor(new Date(ms.createdAt).getTime() / 1000),
              expiry: 0,
              revoked: ms.status === 'REJECTED' || ms.status === 'REVOKED',
              revocationReason: ms.statusReason,
              validity: ms.status === 'VERIFIED' ? 'VALID' : ms.status === 'REJECTED' || ms.status === 'REVOKED' ? 'REVOKED' : 'PENDING',
              validityExplanation:
                ms.status === 'VERIFIED'
                  ? 'Work verified and confirmed.'
                  : ms.status === 'REJECTED'
                  ? `Rejected: ${ms.statusReason || 'Requirements not met'}`
                  : 'Pending reviewer verification.',
              isLiveOnChain: !!ms.transactionHash,
            }));
        }
      } catch {
        // Fallback to on-chain only
      }

      const attestations = [...onChainAttestations, ...mongoAttestations].sort((a, b) => b.issuedAt - a.issuedAt);

      const byClaimType = Object.fromEntries(claimTypes.map((type) => [
        type,
        attestations.filter((attestation) => attestation.claimType === type).length,
      ])) as Record<ClaimType, number>;
      const uniqueIssuers = [...new Set(attestations.map((attestation) => attestation.issuer))];

      // Multicall issuer authorizations in 1 batch
      const authResults = await publicClient.multicall({
        contracts: uniqueIssuers.map((issuer) => ({
          ...CONTRACT_CONFIG,
          functionName: 'isIssuer',
          args: [issuer],
        })),
        allowFailure: true,
      });

      const trustedIssuers: IssuerProfile[] = uniqueIssuers.map((issuer, idx) => {
        const isAuth = authResults[idx]?.status === 'success' ? Boolean(authResults[idx].result) : false;
        return {
          address: issuer,
          name: issuer,
          organization: 'Unspecified on-chain',
          role: 'Registry issuer',
          isAuthorized: isAuth,
          attestationsIssuedCount: attestations.filter((attestation) => attestation.issuer === issuer).length,
        };
      });

      return {
        address: subject,
        alias: undefined,
        firstSeenAt: attestations.length ? Math.min(...attestations.map((attestation) => attestation.issuedAt)) : undefined,
        stats: {
          totalAttestations: attestations.length,
          validAttestations: attestations.filter((attestation) => attestation.validity === 'VALID').length,
          revokedAttestations: attestations.filter((attestation) => attestation.validity === 'REVOKED').length,
          expiredAttestations: attestations.filter((attestation) => attestation.validity === 'EXPIRED').length,
          invalidIssuerAttestations: attestations.filter((attestation) => attestation.validity === 'INVALID_ISSUER').length,
          evidenceMismatchAttestations: 0,
          byClaimType,
        },
        attestations,
        trustedIssuers,
      };
    }

    return getProfileForAddress(rawAddress);
  }

  public async isIssuerAuthorized(address: `0x${string}` | string): Promise<boolean> {
    if (this.isLiveMode) {
      if (!isAddress(address)) throw new Error('Enter a valid issuer address.');
      await this.assertRegistryAvailable();
      return publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'isIssuer', args: [address as `0x${string}`] });
    }
    const addr = address.toLowerCase();
    if (addr === DEMO_WALLETS.ORGANIZER.address.toLowerCase()) return true;
    const issuer = this.demoIssuers.find((i) => i.address.toLowerCase() === addr);
    return !!issuer && issuer.isAuthorized;
  }

  public async getIssuers(): Promise<IssuerProfile[]> {
    if (this.isLiveMode) {
      const attestations = await this.getAllAttestations();
      const addresses = [...new Set(attestations.map((attestation) => attestation.issuer))];
      const authResults = await publicClient.multicall({
        contracts: addresses.map((addr) => ({
          ...CONTRACT_CONFIG,
          functionName: 'isIssuer',
          args: [addr],
        })),
        allowFailure: true,
      });

      return addresses.map((address, index) => {
        const isAuth = authResults[index]?.status === 'success' ? Boolean(authResults[index].result) : false;
        return {
          address,
          name: address,
          organization: 'Unspecified on-chain',
          role: 'Registry issuer',
          isAuthorized: isAuth,
          attestationsIssuedCount: attestations.filter((attestation) => attestation.issuer === address).length,
        };
      });
    }
    return [...this.demoIssuers];
  }

  public evaluateValidity(att: Attestation): Attestation {
    const isIssuerValid =
      att.issuer.toLowerCase() === DEMO_WALLETS.ORGANIZER.address.toLowerCase() ||
      att.issuer.toLowerCase() === DEMO_WALLETS.REVIEWER.address.toLowerCase() ||
      att.issuerAuthorized;

    const nowSec = Math.floor(Date.now() / 1000);
    const expirySec = att.expiry < 1e11 ? att.expiry : Math.floor(att.expiry / 1000);

    let validity: ValidityStatus = 'VALID';
    let explanation = 'Attestation is currently valid and active on TrustGraph.';

    if (att.revoked) {
      validity = 'REVOKED';
      explanation = att.revocationReason
        ? `Explicitly revoked: "${att.revocationReason}"`
        : 'Explicitly revoked by issuer or administrator.';
    } else if (expirySec > 0 && nowSec >= expirySec) {
      validity = 'EXPIRED';
      explanation = `Attestation reached expiration on ${new Date(expirySec * 1000).toLocaleDateString()}.`;
    } else if (!isIssuerValid) {
      validity = 'INVALID_ISSUER';
      explanation = 'The issuing authority is no longer authorized in the TrustGraph registry.';
    }

    return {
      ...att,
      issuerAuthorized: isIssuerValid,
      validity,
      validityExplanation: explanation,
    };
  }

  public async issueAttestation(input: {
    subject: `0x${string}`;
    claimType: ClaimType;
    claimTitle: string;
    claimDescription: string;
    evidenceUrl: string;
    evidenceHash: `0x${string}`;
    evidenceManifest?: string;
    expiry: number;
    issuer: `0x${string}`;
    issuerName?: string;
    txHash?: `0x${string}`;
    blockNumber?: number;
    isLiveOnChain?: boolean;
    onChainId?: string;
  }): Promise<Attestation> {
    if (this.isLiveMode) throw new Error('Live issuance must use the wallet hook and a receipt-confirmed contract transaction.');
    const newId = input.onChainId || String(this.demoAttestations.length + 1);
    const isAuth = await this.isIssuerAuthorized(input.issuer);

    const attestation: Attestation = {
      id: newId,
      subject: input.subject,
      subjectName: input.subject.toLowerCase() === DEMO_WALLETS.DEVELOPER.address.toLowerCase() ? 'Sarah (Demo Builder)' : undefined,
      issuer: input.issuer,
      issuerName: input.issuerName || (input.issuer.toLowerCase() === DEMO_WALLETS.REVIEWER.address.toLowerCase() ? 'Monad Ecosystem Reviewer' : 'Authorized Reviewer'),
      issuerRole: 'Authorized Technical Issuer',
      issuerAuthorized: isAuth,
      claimType: input.claimType,
      claimTitle: input.claimTitle,
      claimDescription: input.claimDescription,
      evidenceUrl: input.evidenceUrl,
      evidenceHash: input.evidenceHash,
      evidenceManifest: input.evidenceManifest || `Evidence URL: ${input.evidenceUrl}\nSubject: ${input.subject}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiry: input.expiry,
      revoked: false,
      validity: isAuth ? 'VALID' : 'INVALID_ISSUER',
      validityExplanation: isAuth
        ? 'Attestation recorded with verified evidence hash.'
        : 'Warning: Issuer is not yet recognized in authorized registry.',
      transactionHash: input.txHash,
      blockNumber: input.blockNumber,
      isLiveOnChain: input.isLiveOnChain ?? false,
    };

    this.demoAttestations.unshift(attestation);
    this.save();
    return attestation;
  }

  public async revokeAttestation(id: string, reason: string, _caller: string): Promise<Attestation> {
    if (this.isLiveMode) throw new Error('Live revocation must use the wallet hook and a receipt-confirmed contract transaction.');
    const index = this.demoAttestations.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());
    if (index === -1) {
      throw new Error(`Attestation #${id} not found`);
    }

    const current = this.demoAttestations[index];
    if (current.revoked) {
      throw new Error('Attestation is already revoked');
    }

    const updated: Attestation = {
      ...current,
      revoked: true,
      revocationReason: reason.trim() || 'Revoked by authorized reviewer',
      revokedAt: Math.floor(Date.now() / 1000),
      validity: 'REVOKED',
      validityExplanation: `This attestation was explicitly revoked: "${reason}"`,
    };

    this.demoAttestations[index] = updated;
    this.save();
    return updated;
  }

  public async verifyEvidenceMatch(
    attestationId: string,
    contentToVerify: string
  ): Promise<{
    matches: boolean;
    computedHash: `0x${string}`;
    expectedHash: `0x${string}`;
    status: ValidityStatus;
    explanation: string;
  }> {
    const attestation = await this.getAttestationById(attestationId);
    if (!attestation) {
      return {
        matches: false,
        computedHash: '0x',
        expectedHash: '0x',
        status: 'NOT_FOUND',
        explanation: `Attestation #${attestationId} does not exist on the registry.`,
      };
    }

    const computed = await computeSha256(contentToVerify);
    const matches = computed.toLowerCase() === attestation.evidenceHash.toLowerCase();

    if (!matches) {
      return {
        matches: false,
        computedHash: computed,
        expectedHash: attestation.evidenceHash,
        status: 'EVIDENCE_MISMATCH',
        explanation: 'Evidence hash mismatch: Presented artifact hash differs from registered on-chain hash.',
      };
    }

    return {
      matches: true,
      computedHash: computed,
      expectedHash: attestation.evidenceHash,
      status: attestation.validity,
      explanation: attestation.validityExplanation,
    };
  }

  public async submitWork(input: {
    worker: `0x${string}`;
    claimType: ClaimType;
    title: string;
    description: string;
    evidenceUrl: string;
    evidenceManifest: string;
    evidenceHash: `0x${string}`;
  }): Promise<WorkSubmission> {
    const submission: WorkSubmission = {
      id: `sub-${Date.now()}`,
      worker: input.worker,
      claimType: input.claimType,
      title: input.title.trim(),
      description: input.description.trim(),
      evidenceUrl: input.evidenceUrl.trim(),
      evidenceManifest: input.evidenceManifest.trim(),
      evidenceHash: input.evidenceHash,
      submittedAt: Math.floor(Date.now() / 1000),
      status: 'PENDING',
    };
    this.submissions.unshift(submission);
    this.save();
    window.dispatchEvent(new Event('storage'));
    return submission;
  }

  public getSubmissions(): WorkSubmission[] {
    return [...this.submissions];
  }

  public getPendingSubmissions(): WorkSubmission[] {
    return this.submissions.filter((s) => s.status === 'PENDING');
  }

  public async rejectSubmission(id: string, reason: string): Promise<WorkSubmission> {
    const index = this.submissions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Submission ${id} not found.`);
    this.submissions[index] = {
      ...this.submissions[index],
      status: 'REJECTED',
      rejectionReason: reason.trim() || 'Work evidence was not accepted by reviewer.',
    };
    this.save();
    window.dispatchEvent(new Event('storage'));
    return this.submissions[index];
  }

  public async approveSubmission(id: string, attestationId: string): Promise<WorkSubmission> {
    const index = this.submissions.findIndex((s) => s.id === id);
    if (index === -1) throw new Error(`Submission ${id} not found.`);
    this.submissions[index] = {
      ...this.submissions[index],
      status: 'APPROVED',
      attestationId,
    };
    this.save();
    window.dispatchEvent(new Event('storage'));
    return this.submissions[index];
  }

  public resetSandbox() {
    this.demoAttestations = [...MOCK_ATTESTATIONS];
    this.demoIssuers = [...MOCK_ISSUERS];
    this.submissions = [...SEED_SUBMISSIONS];
    this.save();
  }
}

export const trustGraphService = new TrustGraphService();
export default trustGraphService;
