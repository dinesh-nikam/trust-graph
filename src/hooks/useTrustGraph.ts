import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { Attestation, ClaimType, TrustProfile } from '../types';
import { trustGraphService } from '../services/trustGraphService';
import { CONTRACT_CONFIG, TRUST_GRAPH_REGISTRY_ADDRESS } from '../lib/contract/config';
import { stringToBytes32 } from '../utils/formatters';

export function useTrustProfile(address?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trustProfile', address?.toLowerCase()],
    queryFn: async (): Promise<TrustProfile | null> => {
      if (!address) return null;
      return trustGraphService.getProfile(address);
    },
    enabled: !!address,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trustProfile', address?.toLowerCase()] });
  }, [queryClient, address]);

  return {
    ...query,
    profile: query.data,
    refetch,
  };
}

export function useAttestation(id?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['attestation', id],
    queryFn: async (): Promise<Attestation | null> => {
      if (!id) return null;
      return trustGraphService.getAttestationById(id);
    },
    enabled: !!id,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['attestation', id] });
  }, [queryClient, id]);

  return {
    ...query,
    attestation: query.data,
    refetch,
  };
}

export function useIssuerStatus(address?: string) {
  const { data: isContractIssuer, isLoading: isCheckingContract } = useReadContract({
    ...CONTRACT_CONFIG,
    functionName: 'isIssuer',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && address.startsWith('0x'),
    },
  });

  const isLocalIssuer = address ? trustGraphService.isIssuerAuthorized(address) : false;

  return {
    isAuthorized: Boolean(isContractIssuer || isLocalIssuer),
    isLoading: isCheckingContract,
  };
}

export type TxStep =
  | 'idle'
  | 'preparing'
  | 'waiting-wallet'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'error';

export function useIssueAttestation() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdAttestation, setCreatedAttestation] = useState<Attestation | null>(null);

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const issue = async (input: {
    subject: `0x${string}`;
    claimType: ClaimType;
    claimTitle: string;
    claimDescription: string;
    evidenceUrl: string;
    evidenceHash: `0x${string}`;
    evidenceManifest?: string;
    expiry: number; // 0 for perpetual, otherwise unix seconds
    isLiveOnChain?: boolean;
  }) => {
    setTxStep('preparing');
    setErrorMessage(null);
    setCreatedAttestation(null);

    try {
      let finalTxHash = txHash;

      // If user chooses live on-chain Monad transaction and wallet is connected
      if (input.isLiveOnChain && address) {
        setTxStep('waiting-wallet');

        const claimBytes32 = stringToBytes32(input.claimType);

        finalTxHash = await writeContractAsync({
          address: TRUST_GRAPH_REGISTRY_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: 'issueAttestation',
          args: [
            input.subject,
            claimBytes32,
            input.evidenceHash,
            input.evidenceUrl,
            BigInt(input.expiry || 0),
          ],
        });

        setTxStep('submitted');
      }

      // Record in trust graph service
      const att = await trustGraphService.issueAttestation({
        ...input,
        issuer: (address || '0x92Fa656bE0656D1F08a6eD7D284976d8b948F721') as `0x${string}`,
        txHash: finalTxHash,
        isLiveOnChain: Boolean(input.isLiveOnChain),
      });

      setCreatedAttestation(att);
      setTxStep('confirmed');

      queryClient.invalidateQueries({ queryKey: ['trustProfile'] });
      queryClient.invalidateQueries({ queryKey: ['attestation'] });

      return att;
    } catch (err: any) {
      console.error('Failed to issue attestation:', err);
      setTxStep('error');
      setErrorMessage(err?.shortMessage || err?.message || 'Transaction was rejected or failed.');
      throw err;
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setCreatedAttestation(null);
  };

  return {
    issue,
    reset,
    txStep,
    errorMessage,
    txHash,
    isConfirming,
    isConfirmed,
    createdAttestation,
  };
}

export function useRevokeAttestation() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { writeContractAsync, data: txHash } = useWriteContract();

  const revoke = async (
    attestationId: string,
    reason: string,
    options?: { isLiveOnChain?: boolean }
  ) => {
    setTxStep('preparing');
    setErrorMessage(null);

    try {
      if (options?.isLiveOnChain && address) {
        setTxStep('waiting-wallet');

        await writeContractAsync({
          address: TRUST_GRAPH_REGISTRY_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: 'revokeAttestation',
          args: [BigInt(attestationId), reason],
        });

        setTxStep('submitted');
      }

      const updated = await trustGraphService.revokeAttestation(
        attestationId,
        reason,
        address || ''
      );

      setTxStep('confirmed');

      queryClient.invalidateQueries({ queryKey: ['trustProfile'] });
      queryClient.invalidateQueries({ queryKey: ['attestation', attestationId] });

      return updated;
    } catch (err: any) {
      console.error('Failed to revoke attestation:', err);
      setTxStep('error');
      setErrorMessage(err?.shortMessage || err?.message || 'Revocation failed.');
      throw err;
    }
  };

  return {
    revoke,
    txStep,
    errorMessage,
    txHash,
  };
}
