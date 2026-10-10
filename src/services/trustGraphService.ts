import { createPublicClient, http, isAddress } from 'viem';
import { Attestation, ClaimType, IssuerProfile, TrustProfile, ValidityStatus, WorkSubmission } from '../types';
import { CONTRACT_CONFIG, DEMO_WALLETS, MONAD_TESTNET_CHAIN_ID, TRUST_GRAPH_REGISTRY_ADDRESS, REGISTRY_ADDRESS_CONFIGURED, monadTestnet } from '../lib/contract/config';
import { bytes32ToString, computeSha256 } from '../utils/formatters';
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
        this.isLiveMode = envMode.toLowerCase() === 'live';
      } else {
        this.isLiveMode = REGISTRY_ADDRESS_CONFIGURED;
      }

      // If live mode is selected but no registry address is configured at all, fallback to DEMO
      if (this.isLiveMode && !REGISTRY_ADDRESS_CONFIGURED) {
        this.isLiveMode = false;
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
      this.isLiveMode = false;
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
    try {
      const chainId = await publicClient.getChainId();
      if (chainId !== MONAD_TESTNET_CHAIN_ID) return false;
      const bytecode = await publicClient.getBytecode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
      return Boolean(bytecode && bytecode !== '0x');
    } catch {
      return false;
    }
  }

  public async getRegistryOwner(): Promise<`0x${string}`> {
    if (!(await this.hasContractBytecode())) throw new Error('No registry contract is deployed at the configured Monad Testnet address.');
    return publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'owner' });
  }

  private async readOnChainAttestation(id: string): Promise<Attestation | null> {
    if (!/^\d+$/.test(id) || BigInt(id) < 1n) return null;
    const numericId = BigInt(id);

    const isDeployed = await this.hasContractBytecode();
    if (!isDeployed) throw new Error('No registry contract is deployed at the configured Monad Testnet address.');

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

  public async getAttestationById(id: string): Promise<Attestation | null> {
    if (this.isLiveMode) {
      const isDeployed = await this.hasContractBytecode();
      if (isDeployed) {
        return this.readOnChainAttestation(id);
      }
      const demoMatch = this.demoAttestations.find((a) => a.id.toLowerCase() === id.toLowerCase());
      if (demoMatch) return this.evaluateValidity(demoMatch);
      return null;
    }

    // Demo records are available only when DEMO mode is explicitly selected.
    const found = this.demoAttestations.find((a) => a.id.toLowerCase() === id.toLowerCase());
    if (!found) return null;

    return this.evaluateValidity(found);
  }

  public async getAllAttestations(): Promise<Attestation[]> {
    if (this.isLiveMode) {
      const isDeployed = await this.hasContractBytecode();
      if (isDeployed) {
        const ids = await publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'getAllAttestationIds' });
        const records = await Promise.all(ids.map((id) => this.readOnChainAttestation(id.toString())));
        return records.filter((record): record is Attestation => record !== null).sort((a, b) => b.issuedAt - a.issuedAt);
      }
      return [...this.demoAttestations];
    }
    return [...this.demoAttestations];
  }

  public async getProfile(rawAddress: string): Promise<TrustProfile> {
    const subject = (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`;

    if (this.isLiveMode) {
      if (!isAddress(subject)) throw new Error('Enter a valid EVM wallet address.');
      const isDeployed = await this.hasContractBytecode();
      if (!isDeployed) {
        return getProfileForAddress(rawAddress);
      }
      const ids = await publicClient.readContract({
        ...CONTRACT_CONFIG,
        functionName: 'getAttestationsBySubject',
        args: [subject],
      });
      const records = await Promise.all(ids.map((id) => this.readOnChainAttestation(id.toString())));
      const attestations = records.filter((record): record is Attestation => record !== null)
        .sort((a, b) => b.issuedAt - a.issuedAt);
      const byClaimType = Object.fromEntries(claimTypes.map((type) => [
        type,
        attestations.filter((attestation) => attestation.claimType === type).length,
      ])) as Record<ClaimType, number>;
      const uniqueIssuers = [...new Set(attestations.map((attestation) => attestation.issuer))];
      const trustedIssuers = await Promise.all(uniqueIssuers.map(async (issuer): Promise<IssuerProfile> => ({
        address: issuer,
        name: issuer,
        organization: 'Unspecified on-chain',
        role: 'Registry issuer',
        isAuthorized: await this.isIssuerAuthorized(issuer),
        attestationsIssuedCount: attestations.filter((attestation) => attestation.issuer === issuer).length,
      })));

      return {
        address: subject,
        alias: subject.toLowerCase() === DEMO_WALLETS.DEVELOPER.address.toLowerCase() ? 'Sarah (Demo Builder)' : undefined,
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
      if (!(await this.hasContractBytecode())) throw new Error('No registry contract is deployed at the configured Monad Testnet address.');
      return publicClient.readContract({ ...CONTRACT_CONFIG, functionName: 'isIssuer', args: [address] });
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
      return Promise.all(addresses.map(async (address) => ({
        address,
        name: address,
        organization: 'Unspecified on-chain',
        role: 'Registry issuer',
        isAuthorized: await this.isIssuerAuthorized(address),
        attestationsIssuedCount: attestations.filter((attestation) => attestation.issuer === address).length,
      })));
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
