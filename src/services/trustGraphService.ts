import { Attestation, ClaimType, IssuerProfile, TrustProfile, ValidityStatus } from '../types';
import { MOCK_ATTESTATIONS, MOCK_ISSUERS, getProfileForAddress } from '../data/mockData';
import { DEMO_WALLETS, TRUST_GRAPH_REGISTRY_ADDRESS, monadTestnet } from '../lib/contract/config';
import { computeSha256 } from '../utils/formatters';
import { createPublicClient, http } from 'viem';
import { TrustGraphRegistryABI } from '../lib/contract/abi';

const STORAGE_KEY = 'trustgraph_attestations_v2';
const STORAGE_ISSUERS_KEY = 'trustgraph_issuers_v2';
const STORAGE_MODE_KEY = 'trustgraph_mode_v2'; // 'LIVE' | 'DEMO'

class TrustGraphService {
  private attestations: Attestation[] = [];
  private issuers: IssuerProfile[] = [...MOCK_ISSUERS];
  private isLiveMode = false;
  private publicClient;

  constructor() {
    this.publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http('https://testnet-rpc.monad.xyz'),
    });
    this.init();
  }

  private init() {
    try {
      const mode = localStorage.getItem(STORAGE_MODE_KEY);
      this.isLiveMode = mode === 'LIVE';

      const storedIssuers = localStorage.getItem(STORAGE_ISSUERS_KEY);
      if (storedIssuers) {
        this.issuers = JSON.parse(storedIssuers);
      }

      const storedAttestations = localStorage.getItem(STORAGE_KEY);
      if (storedAttestations) {
        this.attestations = JSON.parse(storedAttestations);
      } else {
        this.attestations = [...MOCK_ATTESTATIONS];
        this.save();
      }
    } catch {
      this.attestations = [...MOCK_ATTESTATIONS];
      this.issuers = [...MOCK_ISSUERS];
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.attestations));
      localStorage.setItem(STORAGE_ISSUERS_KEY, JSON.stringify(this.issuers));
      localStorage.setItem(STORAGE_MODE_KEY, this.isLiveMode ? 'LIVE' : 'DEMO');
    } catch (e) {
      console.warn('Failed to save TrustGraph state to localStorage', e);
    }
  }

  public getMode(): 'LIVE' | 'DEMO' {
    return this.isLiveMode ? 'LIVE' : 'DEMO';
  }

  public setMode(mode: 'LIVE' | 'DEMO') {
    this.isLiveMode = mode === 'LIVE';
    this.save();
  }

  public async getAllAttestations(): Promise<Attestation[]> {
    return [...this.attestations];
  }

  public async getAttestationById(id: string): Promise<Attestation | null> {
    const found = this.attestations.find((a) => a.id.toLowerCase() === id.toLowerCase());
    if (!found) return null;

    // Dynamically evaluate validity in case time passed or issuer was revoked
    return this.evaluateValidity(found);
  }

  public async getProfile(rawAddress: string): Promise<TrustProfile> {
    const addr = rawAddress.toLowerCase();
    const subjectAttestations = this.attestations
      .filter((a) => a.subject.toLowerCase() === addr)
      .map((a) => this.evaluateValidity(a));

    const byClaimType: Record<ClaimType, number> = {
      CONTRACT_DEPLOYED: subjectAttestations.filter((a) => a.claimType === 'CONTRACT_DEPLOYED').length,
      CHALLENGE_COMPLETED: subjectAttestations.filter((a) => a.claimType === 'CHALLENGE_COMPLETED').length,
      CONTRIBUTION_VERIFIED: subjectAttestations.filter((a) => a.claimType === 'CONTRIBUTION_VERIFIED').length,
    };

    const validCount = subjectAttestations.filter((a) => a.validity === 'VALID').length;
    const revokedCount = subjectAttestations.filter((a) => a.validity === 'REVOKED').length;
    const expiredCount = subjectAttestations.filter((a) => a.validity === 'EXPIRED').length;
    const invalidIssuerCount = subjectAttestations.filter((a) => a.validity === 'INVALID_ISSUER').length;

    const baseProfile = getProfileForAddress(rawAddress);

    return {
      address: (rawAddress.startsWith('0x') ? rawAddress : `0x${rawAddress}`) as `0x${string}`,
      alias: baseProfile.alias,
      bio: baseProfile.bio,
      firstSeenAt: subjectAttestations.length > 0 ? subjectAttestations[subjectAttestations.length - 1].issuedAt : Date.now(),
      stats: {
        totalAttestations: subjectAttestations.length,
        validAttestations: validCount,
        revokedAttestations: revokedCount,
        expiredAttestations: expiredCount,
        invalidIssuerAttestations: invalidIssuerCount,
        byClaimType,
      },
      attestations: subjectAttestations,
      trustedIssuers: this.issuers.filter((iss) =>
        subjectAttestations.some((a) => a.issuer.toLowerCase() === iss.address.toLowerCase())
      ),
    };
  }

  public isIssuerAuthorized(address: string): boolean {
    const addr = address.toLowerCase();
    if (addr === DEMO_WALLETS.ORGANIZER.address.toLowerCase()) return true;
    const issuer = this.issuers.find((i) => i.address.toLowerCase() === addr);
    return !!issuer && issuer.isAuthorized;
  }

  public async getIssuers(): Promise<IssuerProfile[]> {
    return [...this.issuers];
  }

  /**
   * Evaluates discrete validity according to contract logic:
   * 1. If revoked -> REVOKED
   * 2. If expiry > 0 and now >= expiry -> EXPIRED
   * 3. If issuer not authorized -> INVALID_ISSUER
   * 4. Else -> VALID
   */
  public evaluateValidity(att: Attestation): Attestation {
    const isIssuerValid = this.isIssuerAuthorized(att.issuer);
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
    expiry: number; // 0 for perpetual
    issuer: `0x${string}`;
    issuerName?: string;
    txHash?: `0x${string}`;
    blockNumber?: number;
    isLiveOnChain?: boolean;
  }): Promise<Attestation> {
    const newId = String(this.attestations.length + 1);
    const isAuth = this.isIssuerAuthorized(input.issuer);

    const attestation: Attestation = {
      id: newId,
      subject: input.subject,
      subjectName: input.subject === DEMO_WALLETS.DEVELOPER.address ? 'Developer Sarah' : undefined,
      issuer: input.issuer,
      issuerName: input.issuerName || (input.issuer === DEMO_WALLETS.REVIEWER.address ? 'Monad Ecosystem Reviewer' : 'Authorized Reviewer'),
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

    this.attestations.unshift(attestation);
    this.save();
    return attestation;
  }

  public async revokeAttestation(id: string, reason: string, caller: string): Promise<Attestation> {
    const index = this.attestations.findIndex((a) => a.id.toLowerCase() === id.toLowerCase());
    if (index === -1) {
      throw new Error(`Attestation #${id} not found`);
    }

    const current = this.attestations[index];
    if (current.revoked) {
      throw new Error('Attestation is already revoked');
    }

    const updated: Attestation = {
      ...current,
      revoked: true,
      revocationReason: reason.trim() || 'Revoked by authorized reviewer',
      revokedAt: Math.floor(Date.now() / 1000),
      validity: 'REVOKED',
      validityExplanation: `This attestation was explicitly revoked on-chain: "${reason}"`,
    };

    this.attestations[index] = updated;
    this.save();
    return updated;
  }

  /**
   * Verifies an off-chain manifest or content against the recorded on-chain evidence hash
   */
  public async verifyEvidenceMatch(
    attestationId: string,
    contentToVerify: string
  ): Promise<{ matches: boolean; computedHash: `0x${string}`; expectedHash: `0x${string}` }> {
    const attestation = await this.getAttestationById(attestationId);
    if (!attestation) throw new Error('Attestation not found');

    const computed = await computeSha256(contentToVerify);
    const matches = computed.toLowerCase() === attestation.evidenceHash.toLowerCase();

    return {
      matches,
      computedHash: computed,
      expectedHash: attestation.evidenceHash,
    };
  }

  /**
   * Resets local sandbox data back to defaults
   */
  public resetSandbox() {
    this.attestations = [...MOCK_ATTESTATIONS];
    this.issuers = [...MOCK_ISSUERS];
    this.save();
  }
}

export const trustGraphService = new TrustGraphService();
export default trustGraphService;
