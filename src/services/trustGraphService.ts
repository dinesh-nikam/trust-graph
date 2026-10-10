import { createPublicClient, http, isAddress, zeroAddress } from 'viem';
import { Attestation, ClaimType, IssuerProfile, TrustProfile, ValidityStatus, WorkSubmission } from '../types';
import { 
  CONTRACT_CONFIG, 
  DEMO_WALLETS, 
  MONAD_TESTNET_CHAIN_ID, 
  TRUST_GRAPH_REGISTRY_ADDRESS, 
  REGISTRY_ADDRESS_CONFIGURED, 
  PROOF_OF_WORK_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY_CONFIGURED,
  monadTestnet 
} from '../lib/contract/config';
import { ProofOfWorkRegistryABI } from '../lib/contract/abi';
import { bytes32ToString, computeSha256, enumIndexToStatus, enumIndexToWorkType, shortenAddress } from '../utils/formatters';
import { MOCK_ATTESTATIONS, MOCK_ISSUERS, getProfileForAddress } from '../data/mockData';


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
    if (!REGISTRY_ADDRESS_CONFIGURED && !PROOF_OF_WORK_REGISTRY_CONFIGURED) return false;
    try {
      const chainId = await publicClient.getChainId();
      if (chainId !== MONAD_TESTNET_CHAIN_ID) return false;

      if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const bytecode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        if (bytecode && bytecode !== '0x') return true;
      }

      if (REGISTRY_ADDRESS_CONFIGURED) {
        const bytecode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        if (bytecode && bytecode !== '0x') return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  public async getContractStatus(): Promise<{
    status:
      | 'BLOCKCHAIN_CONNECTED'
      | 'CONTRACT_NOT_CONFIGURED'
      | 'CONTRACT_NOT_DEPLOYED'
      | 'CONTRACT_UNREADABLE'
      | 'WRONG_NETWORK'
      | 'RPC_UNAVAILABLE'
      | 'CONTRACT_READY';
    proofOfWorkReady: boolean;
    trustGraphReady: boolean;
    chainId: number;
    error?: string;
  }> {
    try {
      const chainId = await publicClient.getChainId();
      if (chainId !== MONAD_TESTNET_CHAIN_ID) {
        return { status: 'WRONG_NETWORK', proofOfWorkReady: false, trustGraphReady: false, chainId };
      }

      let powReady = false;
      let tgReady = false;

      if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const code = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        powReady = Boolean(code && code !== '0x');
      }

      if (REGISTRY_ADDRESS_CONFIGURED) {
        const code = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        tgReady = Boolean(code && code !== '0x');
      }

      if (powReady || tgReady) {
        return { status: 'CONTRACT_READY', proofOfWorkReady: powReady, trustGraphReady: tgReady, chainId };
      }

      if (!PROOF_OF_WORK_REGISTRY_CONFIGURED && !REGISTRY_ADDRESS_CONFIGURED) {
        return { status: 'CONTRACT_NOT_CONFIGURED', proofOfWorkReady: false, trustGraphReady: false, chainId };
      }

      return { status: 'CONTRACT_NOT_DEPLOYED', proofOfWorkReady: false, trustGraphReady: false, chainId };
    } catch (err: unknown) {
      return {
        status: 'RPC_UNAVAILABLE',
        proofOfWorkReady: false,
        trustGraphReady: false,
        chainId: 0,
        error: err instanceof Error ? err.message : 'Monad RPC unavailable',
      };
    }
  }

  private async assertRegistryAvailable(): Promise<void> {
    const chainId = await publicClient.getChainId();
    if (chainId !== MONAD_TESTNET_CHAIN_ID) {
      throw new Error(`Registry RPC returned chain ID ${chainId}; expected Monad Testnet (${MONAD_TESTNET_CHAIN_ID}).`);
    }
    const hasAny = await this.hasContractBytecode();
    if (!hasAny) {
      throw new Error('No registry contract is deployed at the configured Monad Testnet address.');
    }
  }

  public async getRegistryOwner(): Promise<`0x${string}`> {
    // If TrustGraphRegistry has bytecode, read owner from it
    if (REGISTRY_ADDRESS_CONFIGURED) {
      const tgCode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
      if (tgCode && tgCode !== '0x') {
        return publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'owner' });
      }
    }
    // Otherwise read owner from deployed ProofOfWorkRegistry
    if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
      const powCode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
      if (powCode && powCode !== '0x') {
        return publicClient.readContract({
          address: PROOF_OF_WORK_REGISTRY_ADDRESS,
          abi: ProofOfWorkRegistryABI,
          functionName: 'owner',
        });
      }
    }
    throw new Error('No active registry contract is deployed at configured addresses.');
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
      // 1. Check deployed ProofOfWorkRegistry for 32-byte workId (0x...)
      if (id.startsWith('0x') && id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const powCode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        if (powCode && powCode !== '0x') {
          try {
            const raw = await publicClient.readContract({
              address: PROOF_OF_WORK_REGISTRY_ADDRESS,
              abi: ProofOfWorkRegistryABI,
              functionName: 'getWork',
              args: [id as `0x${string}`],
            });
            if (raw.createdAt !== 0n) {
              const statusEnum = Number(raw.status);
              const isVerified = statusEnum === 1;
              const isRevoked = statusEnum === 3;
              const validity: ValidityStatus = isRevoked ? 'REVOKED' : isVerified ? 'VALID' : 'PENDING';
              const workType = enumIndexToWorkType(Number(raw.workType));
              const hasVerifier = raw.verifier !== zeroAddress;

              return {
                id: raw.workId,
                issuer: raw.verifier,
                issuerName: hasVerifier ? shortenAddress(raw.verifier) : 'Pending Reviewer',
                issuerRole: 'Authorized Verifier',
                issuerAuthorized: hasVerifier,
                subject: raw.worker,
                claimType: workType as ClaimType,
                claimTitle: `${workType} Proof`,
                claimDescription: `Proof of work recorded in ProofOfWorkRegistry on Monad Testnet.`,
                evidenceHash: raw.evidenceHash,
                evidenceUrl: raw.metadataUri,
                evidenceManifest: `Evidence URI: ${raw.metadataUri}\nHash: ${raw.evidenceHash}`,
                issuedAt: Number(raw.verifiedAt || raw.createdAt),
                expiry: 0,
                revoked: isRevoked,
                revocationReason: raw.statusReason || undefined,
                validity,
                validityExplanation: isRevoked
                  ? `Revoked: ${raw.statusReason || 'Revoked on Monad.'}`
                  : isVerified
                  ? 'Verified on-chain by authorized verifier on Monad Testnet.'
                  : 'Pending verifier triage.',
                isLiveOnChain: true,
              };
            }
          } catch {
            // Not found in ProofOfWorkRegistry
          }
        }
      }

      // 2. Check TrustGraphRegistry if deployed and valid integer ID
      if (/^\d+$/.test(id) && BigInt(id) >= 1n && REGISTRY_ADDRESS_CONFIGURED) {
        const tgCode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        if (tgCode && tgCode !== '0x') {
          return this.readOnChainAttestation(id);
        }
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
      const results: Attestation[] = [];

      // 1. Read from deployed ProofOfWorkRegistry
      if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const powCode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        if (powCode && powCode !== '0x') {
          try {
            const allWorkIds = await publicClient.readContract({
              address: PROOF_OF_WORK_REGISTRY_ADDRESS,
              abi: ProofOfWorkRegistryABI,
              functionName: 'getAllWorkIds',
            });
            if (allWorkIds.length > 0) {
              const works = await publicClient.readContract({
                address: PROOF_OF_WORK_REGISTRY_ADDRESS,
                abi: ProofOfWorkRegistryABI,
                functionName: 'getWorks',
                args: [allWorkIds as `0x${string}`[]],
              });
              for (const raw of works) {
                const statusEnum = Number(raw.status);
                const isVerified = statusEnum === 1;
                const isRevoked = statusEnum === 3;
                const validity: ValidityStatus = isRevoked ? 'REVOKED' : isVerified ? 'VALID' : 'PENDING';
                const workType = enumIndexToWorkType(Number(raw.workType));
                const hasVerifier = raw.verifier !== zeroAddress;

                results.push({
                  id: raw.workId,
                  issuer: raw.verifier,
                  issuerName: hasVerifier ? shortenAddress(raw.verifier) : 'Pending Verifier',
                  issuerRole: 'Authorized Verifier',
                  issuerAuthorized: hasVerifier,
                  subject: raw.worker,
                  claimType: workType as ClaimType,
                  claimTitle: `${workType} Proof`,
                  claimDescription: `Proof of work recorded on Monad Testnet with evidence digest ${raw.evidenceHash}`,
                  evidenceHash: raw.evidenceHash,
                  evidenceUrl: raw.metadataUri,
                  evidenceManifest: `Evidence URI: ${raw.metadataUri}\nHash: ${raw.evidenceHash}`,
                  issuedAt: Number(raw.verifiedAt || raw.createdAt),
                  expiry: 0,
                  revoked: isRevoked,
                  revocationReason: raw.statusReason || undefined,
                  validity,
                  validityExplanation: isRevoked
                    ? `Revoked: ${raw.statusReason || 'Revocation recorded on Monad.'}`
                    : isVerified
                    ? 'Verified on-chain by authorized verifier on Monad Testnet.'
                    : 'Pending verifier triage.',
                  isLiveOnChain: true,
                });
              }
            }
          } catch (powErr) {
            console.warn('Failed reading ProofOfWorkRegistry in getAllAttestations:', powErr);
          }
        }
      }

      // 2. Read from TrustGraphRegistry if deployed
      if (REGISTRY_ADDRESS_CONFIGURED) {
        const tgCode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        if (tgCode && tgCode !== '0x') {
          try {
            const ids = await publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'getAllAttestationIds' });
            const tgRecords = await this.readOnChainAttestationsBatch(ids as bigint[]);
            results.push(...tgRecords);
          } catch (tgErr) {
            console.warn('Failed reading TrustGraphRegistry in getAllAttestations:', tgErr);
          }
        }
      }

      return results.sort((a, b) => b.issuedAt - a.issuedAt);
    }
    return [...this.demoAttestations];
  }

  public async getProfile(rawAddress: string): Promise<TrustProfile> {
    const subject = (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`;

    if (this.isLiveMode) {
      if (!isAddress(subject, { strict: false })) throw new Error('Enter a valid EVM wallet address.');
      await this.assertRegistryAvailable();

      const attestations: Attestation[] = [];

      // 1. Fetch worker works from deployed ProofOfWorkRegistry
      if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const powCode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        if (powCode && powCode !== '0x') {
          try {
            const workerWorkIds = await publicClient.readContract({
              address: PROOF_OF_WORK_REGISTRY_ADDRESS,
              abi: ProofOfWorkRegistryABI,
              functionName: 'getWorksByWorker',
              args: [subject],
            });
            if (workerWorkIds.length > 0) {
              const works = await publicClient.readContract({
                address: PROOF_OF_WORK_REGISTRY_ADDRESS,
                abi: ProofOfWorkRegistryABI,
                functionName: 'getWorks',
                args: [workerWorkIds as `0x${string}`[]],
              });
              for (const raw of works) {
                const statusEnum = Number(raw.status);
                const isVerified = statusEnum === 1;
                const isRevoked = statusEnum === 3;
                const validity: ValidityStatus = isRevoked ? 'REVOKED' : isVerified ? 'VALID' : 'PENDING';
                const workType = enumIndexToWorkType(Number(raw.workType));
                const hasVerifier = raw.verifier !== zeroAddress;

                attestations.push({
                  id: raw.workId,
                  issuer: raw.verifier,
                  issuerName: hasVerifier ? shortenAddress(raw.verifier) : 'Pending Reviewer',
                  issuerRole: 'Authorized Verifier',
                  issuerAuthorized: hasVerifier,
                  subject: raw.worker,
                  claimType: workType as ClaimType,
                  claimTitle: `${workType} Proof`,
                  claimDescription: `Proof of work recorded on Monad Testnet with evidence digest ${raw.evidenceHash}`,
                  evidenceHash: raw.evidenceHash,
                  evidenceUrl: raw.metadataUri,
                  evidenceManifest: `Evidence URI: ${raw.metadataUri}\nHash: ${raw.evidenceHash}`,
                  issuedAt: Number(raw.verifiedAt || raw.createdAt),
                  expiry: 0,
                  revoked: isRevoked,
                  revocationReason: raw.statusReason || undefined,
                  validity,
                  validityExplanation: isRevoked
                    ? `Revoked: ${raw.statusReason || 'Revocation recorded on Monad.'}`
                    : isVerified
                    ? 'Verified on-chain by authorized verifier on Monad Testnet.'
                    : 'Pending verifier triage.',
                  isLiveOnChain: true,
                });
              }
            }
          } catch (powErr) {
            console.warn('Failed reading worker works from ProofOfWorkRegistry:', powErr);
          }
        }
      }

      // 2. Fetch from TrustGraphRegistry if deployed
      if (REGISTRY_ADDRESS_CONFIGURED) {
        const tgCode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        if (tgCode && tgCode !== '0x') {
          try {
            const ids = await publicClient.readContract({
              ...CONTRACT_CONFIG,
              functionName: 'getAttestationsBySubject',
              args: [subject],
            });
            const tgRecords = await this.readOnChainAttestationsBatch(ids as bigint[]);
            attestations.push(...tgRecords);
          } catch (tgErr) {
            console.warn('Failed reading subject attestations from TrustGraphRegistry:', tgErr);
          }
        }
      }

      attestations.sort((a, b) => b.issuedAt - a.issuedAt);

      const byClaimType = Object.fromEntries(claimTypes.map((type) => [
        type,
        attestations.filter((attestation) => attestation.claimType === type).length,
      ])) as Record<ClaimType, number>;

      const uniqueIssuers = [...new Set(attestations.map((a) => a.issuer).filter((i) => i !== zeroAddress))];
      const trustedIssuers: IssuerProfile[] = uniqueIssuers.map((issuer) => ({
        address: issuer,
        name: shortenAddress(issuer),
        organization: 'Monad Ecosystem Verifier',
        role: 'Authorized Verifier',
        isAuthorized: true,
        attestationsIssuedCount: attestations.filter((a) => a.issuer.toLowerCase() === issuer.toLowerCase()).length,
      }));

      return {
        address: subject,
        alias: undefined,
        firstSeenAt: attestations.length ? Math.min(...attestations.map((a) => a.issuedAt)) : undefined,
        stats: {
          totalAttestations: attestations.length,
          validAttestations: attestations.filter((a) => a.validity === 'VALID').length,
          revokedAttestations: attestations.filter((a) => a.validity === 'REVOKED').length,
          expiredAttestations: attestations.filter((a) => a.validity === 'EXPIRED').length,
          invalidIssuerAttestations: attestations.filter((a) => a.validity === 'INVALID_ISSUER').length,
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
      if (!isAddress(address, { strict: false })) throw new Error('Enter a valid issuer address.');

      // Check deployed ProofOfWorkRegistry first
      if (PROOF_OF_WORK_REGISTRY_CONFIGURED) {
        const powCode = await publicClient.getBytecode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
        if (powCode && powCode !== '0x') {
          try {
            const isVer = await publicClient.readContract({
              address: PROOF_OF_WORK_REGISTRY_ADDRESS,
              abi: ProofOfWorkRegistryABI,
              functionName: 'isVerifier',
              args: [address as `0x${string}`],
            });
            if (isVer) return true;
          } catch {
            // Fallthrough
          }
        }
      }

      // Check TrustGraphRegistry if deployed
      if (REGISTRY_ADDRESS_CONFIGURED) {
        const tgCode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
        if (tgCode && tgCode !== '0x') {
          try {
            return await publicClient.readContract({
              ...CONTRACT_CONFIG,
              functionName: 'isIssuer',
              args: [address as `0x${string}`],
            });
          } catch {
            return false;
          }
        }
      }

      return false;
    }

    const addr = address.toLowerCase();
    if (addr === DEMO_WALLETS.ORGANIZER.address.toLowerCase()) return true;
    const issuer = this.demoIssuers.find((i) => i.address.toLowerCase() === addr);
    return !!issuer && issuer.isAuthorized;
  }

  public async getIssuers(): Promise<IssuerProfile[]> {
    if (this.isLiveMode) {
      const attestations = await this.getAllAttestations();
      const addresses = [...new Set(attestations.map((a) => a.issuer).filter((i) => i !== zeroAddress))];
      const authMap = new Map<string, boolean>();

      for (const addr of addresses) {
        try {
          const auth = await this.isIssuerAuthorized(addr);
          authMap.set(addr.toLowerCase(), auth);
        } catch {
          authMap.set(addr.toLowerCase(), false);
        }
      }

      return addresses.map((addr) => ({
        address: addr,
        name: shortenAddress(addr),
        organization: 'Monad Ecosystem Reviewer',
        role: 'Authorized Verifier',
        isAuthorized: authMap.get(addr.toLowerCase()) ?? false,
        attestationsIssuedCount: attestations.filter((a) => a.issuer.toLowerCase() === addr.toLowerCase()).length,
      }));
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
