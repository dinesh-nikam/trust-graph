import { trustGraphService } from './trustGraphService';
import { WorkRecord, DeveloperPassport, VerifierProfile } from '../types';

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

  public async registerWork(_input: unknown): Promise<WorkRecord> {
    throw new Error('Work registration is not supported by the deployed TrustGraphRegistry interface.');
  }

  public async verifyWork(_workId: string, _verifierAddress: string): Promise<WorkRecord> {
    throw new Error('The deployed registry does not implement a separate verification transition.');
  }

  public async rejectWork(_workId: string, _reason: string): Promise<WorkRecord> {
    throw new Error('The deployed registry does not implement rejection.');
  }

  public async revokeWork(_workId: string, _reason: string): Promise<WorkRecord> {
    throw new Error('Revocation must use the wallet transaction hook and a confirmed Monad receipt.');
  }

  public async getVerifiers(): Promise<VerifierProfile[]> {
    return trustGraphService.getIssuers();
  }
}

export const workService = new WorkService();
export default workService;
