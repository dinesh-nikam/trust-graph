import { useAllAttestations, useTrustProfile, useAttestation, useIssueAttestation, useRevokeAttestation, useIssuerStatus } from './useTrustGraph';

export const usePassport = useTrustProfile;
export const useWorkItem = useAttestation;
export const useVerifierQueue = () => {
  const { data: attestations = [], isLoading, refetch } = useAllAttestations();
  return {
    pendingWorks: attestations.filter((attestation) => attestation.validity === 'PENDING'),
    isLoading,
    refetch,
  };
};

export const useWorkActions = () => {
  const issue = useIssueAttestation();
  const revoke = useRevokeAttestation();

  return {
    register: issue.issue,
    verify: async () => { throw new Error('The deployed registry has no separate verification transition.'); },
    reject: async () => { throw new Error('The deployed registry has no rejection transition.'); },
    revoke: revoke.revoke,
    isLoading: issue.txStep === 'confirming' || issue.txStep === 'waiting-wallet',
  };
};

export {
  useTrustProfile,
  useAttestation,
  useAllAttestations,
  useIssueAttestation,
  useRevokeAttestation,
  useIssuerStatus,
};
