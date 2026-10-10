import { useTrustProfile, useAttestation, useIssueAttestation, useRevokeAttestation, useIssuerStatus } from './useTrustGraph';

export const usePassport = useTrustProfile;
export const useWorkItem = useAttestation;
export const useVerifierQueue = () => {
  const { profile, isLoading, refetch } = useTrustProfile('0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1');
  return {
    pendingWorks: profile?.attestations || [],
    isLoading,
    refetch,
  };
};

export const useWorkActions = () => {
  const issue = useIssueAttestation();
  const revoke = useRevokeAttestation();

  return {
    register: issue.issue,
    verify: async () => {},
    reject: revoke.revoke,
    revoke: revoke.revoke,
    isLoading: issue.txStep === 'confirming' || issue.txStep === 'waiting-wallet',
  };
};

export {
  useTrustProfile,
  useAttestation,
  useIssueAttestation,
  useRevokeAttestation,
  useIssuerStatus,
};
