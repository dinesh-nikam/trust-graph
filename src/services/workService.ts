import { trustGraphService } from './trustGraphService';
import { WorkRecord, DeveloperPassport, WorkType, VerifierProfile } from '../types';

export class WorkService {
  public async getAllWorks(): Promise<WorkRecord[]> {
    return trustGraphService.getAllAttestations();
  }

  public async getWorkById(workId: string): Promise<WorkRecord | null> {
    return trustGraphService.getAttestationById(workId);
  }

  public async getPassport(address: string): Promise<DeveloperPassport | null> {
    return trustGraphService.getProfile(address);
  }

  public async registerWork(input: any): Promise<WorkRecord> {
    return trustGraphService.issueAttestation({
      subject: input.worker,
      claimType: input.workType,
      claimTitle: input.title,
      claimDescription: input.description,
      evidenceUrl: input.evidenceUrl,
      evidenceHash: input.evidenceHash,
      expiry: 0,
      issuer: input.worker,
    });
  }

  public async verifyWork(workId: string, verifierAddress: string): Promise<WorkRecord> {
    const item = await trustGraphService.getAttestationById(workId);
    if (!item) throw new Error('Work not found');
    return item;
  }

  public async rejectWork(workId: string, reason: string): Promise<WorkRecord> {
    return trustGraphService.revokeAttestation(workId, reason, '');
  }

  public async revokeWork(workId: string, reason: string): Promise<WorkRecord> {
    return trustGraphService.revokeAttestation(workId, reason, '');
  }

  public async getVerifiers(): Promise<VerifierProfile[]> {
    return trustGraphService.getIssuers();
  }
}

export const workService = new WorkService();
export default workService;
