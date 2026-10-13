import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { Attestation, ClaimType, TrustProfile } from '../types';
import { trustGraphService } from '../services/trustGraphService';
import { CONTRACT_CONFIG, TRUST_GRAPH_REGISTRY_ADDRESS } from '../lib/contract/config';
import { MONAD_TESTNET_CHAIN_ID } from '../lib/blockchain/chain';
import { stringToBytes32 } from '../utils/formatters';
import { translateTxError } from '../lib/blockchain/errors';

/** Max time to wait for a Monad receipt before surfacing a timeout error. */
export const RECEIPT_TIMEOUT_MS = 120_000;

export function useTrustProfile(address?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['trustProfile', address?.toLowerCase()],
    queryFn: (): Promise<TrustProfile | null> => address ? trustGraphService.getProfile(address) : Promise.resolve(null),
    enabled: !!address,
  });
  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: ['trustProfile', address?.toLowerCase()] }), [queryClient, address]);
  return { ...query, profile: query.data, refetch };
}

export function useAttestation(id?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['attestation', id],
    queryFn: (): Promise<Attestation | null> => id ? trustGraphService.getAttestationById(id) : Promise.resolve(null),
    enabled: !!id,
    refetchInterval: 15_000,
  });
  const refetch = useCallback(() => queryClient.invalidateQueries({ queryKey: ['attestation', id] }), [queryClient, id]);
  return { ...query, attestation: query.data, refetch };
}

export function useAllAttestations() {
  return useQuery({
    queryKey: ['allAttestations'],
    queryFn: () => trustGraphService.getAllAttestations(),
    refetchInterval: 15_000,
  });
}

export function useIssuerStatus(address?: string) {
  const result = useQuery({
    queryKey: ['issuerAuthorization', address?.toLowerCase()],
    queryFn: () => trustGraphService.isIssuerAuthorized(address as `0x${string}`),
    enabled: !!address,
    refetchInterval: 15_000,
  });
  return {
    isAuthorized: result.data === true,
    isLoading: result.isLoading,
    error: result.error,
  };
}

export function useRegistryOwner() {
  const result = useQuery({
    queryKey: ['registryOwner'],
    queryFn: () => trustGraphService.getRegistryOwner(),
  });
  return { owner: result.data, isLoading: result.isLoading, error: result.error };
}

export type TxStep = 'idle' | 'preparing' | 'waiting-wallet' | 'submitted' | 'confirming' | 'confirmed' | 'error';

function errorText(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message;
    if (/user rejected|user denied/i.test(message)) return 'Transaction cancelled in wallet.';
    if (/insufficient funds/i.test(message)) return 'Insufficient MON balance on Monad testnet.';
    return message;
  }
  return fallback;
}

function requireMonadWallet(address?: `0x${string}`, chainId?: number) {
  if (!address) throw new Error('Connect an issuer wallet to continue.');
  if (chainId !== MONAD_TESTNET_CHAIN_ID) throw new Error('Switch your wallet to Monad Testnet (10143).');
}

export function useIssueAttestation() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [createdAttestation, setCreatedAttestation] = useState<Attestation | null>(null);

  const { writeContractAsync } = useWriteContract();
  const inFlightRef = useRef(false);

  const issue = async (input: {
    subject: `0x${string}`;
    claimType: ClaimType;
    claimTitle: string;
    claimDescription: string;
    evidenceUrl: string;
    evidenceHash: `0x${string}`;
    evidenceManifest?: string;
    expiry: number;
    isLiveOnChain?: boolean;
  }) => {
    // Guard against duplicate submissions while a transaction is in flight.
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;

    setTxStep('preparing');
    setErrorMessage(null);
    setCreatedAttestation(null);
    setTxHash(undefined);

    try {
      let finalTxHash: `0x${string}` | undefined;
      let blockNumber: number | undefined;
      const isLive = Boolean(input.isLiveOnChain && address);

      // Live path: broadcast, then wait for the receipt before promoting state.
      if (isLive) {
        setTxStep('waiting-wallet');

        finalTxHash = await writeContractAsync({
          chainId: MONAD_TESTNET_CHAIN_ID,
          address: TRUST_GRAPH_REGISTRY_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: 'issueAttestation',
          args: [
            input.subject,
            stringToBytes32(input.claimType),
            input.evidenceHash,
            input.evidenceUrl,
            BigInt(input.expiry || 0),
          ],
        });

        // Transaction hash received — broadcast, awaiting block inclusion.
        setTxHash(finalTxHash);
        setTxStep('submitted');

        if (!publicClient) {
          throw new Error('No Monad Testnet RPC client is configured for receipt confirmation.');
        }

        setTxStep('confirming');
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: finalTxHash,
          timeout: RECEIPT_TIMEOUT_MS,
        });

        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted on Monad Testnet.');
        }

        blockNumber = Number(receipt.blockNumber);
      }

      // Only reached once the live receipt is confirmed (or for a local sandbox record).
      const att = await trustGraphService.issueAttestation({
        ...input,
        issuer: (address || '0x92Fa656bE0656D1F08a6eD7D284976d8b948F721') as `0x${string}`,
        txHash: finalTxHash,
        blockNumber,
        isLiveOnChain: isLive,
      });

      setCreatedAttestation(att);
      setTxStep('confirmed');

      queryClient.invalidateQueries({ queryKey: ['trustProfile'] });
      queryClient.invalidateQueries({ queryKey: ['attestation'] });

      return att;
    } catch (err) {
      console.error('Failed to issue attestation:', err);
      setTxStep('error');
      setErrorMessage(translateTxError(err));
      throw err;
    } finally {
      inFlightRef.current = false;
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
    setCreatedAttestation(null);
    setTxHash(undefined);
  };

  return {
    issue,
    reset,
    txStep,
    errorMessage,
    txHash,
    createdAttestation,
  };
}

export function useRevokeAttestation() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);

  const { writeContractAsync } = useWriteContract();
  const inFlightRef = useRef(false);

  const revoke = async (
    attestationId: string,
    reason: string,
    options?: { isLiveOnChain?: boolean }
  ) => {
    // Guard against duplicate submissions while a transaction is in flight.
    if (inFlightRef.current) return undefined;
    inFlightRef.current = true;

    setTxStep('preparing');
    setErrorMessage(null);
    setTxHash(undefined);

    try {
      const isLive = Boolean(options?.isLiveOnChain && address);

      // Live path: broadcast, then wait for the receipt before promoting state.
      if (isLive) {
        setTxStep('waiting-wallet');

        const hash = await writeContractAsync({
          chainId: MONAD_TESTNET_CHAIN_ID,
          address: TRUST_GRAPH_REGISTRY_ADDRESS,
          abi: CONTRACT_CONFIG.abi,
          functionName: 'revokeAttestation',
          args: [BigInt(attestationId), reason],
        });

        // Transaction hash received — broadcast, awaiting block inclusion.
        setTxHash(hash);
        setTxStep('submitted');

        if (!publicClient) {
          throw new Error('No Monad Testnet RPC client is configured for receipt confirmation.');
        }

        setTxStep('confirming');
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: RECEIPT_TIMEOUT_MS,
        });

        if (receipt.status !== 'success') {
          throw new Error('Revocation transaction reverted on Monad Testnet.');
        }
      }

      // Only reached once the live receipt is confirmed (or for a local sandbox record).
      const updated = await trustGraphService.revokeAttestation(
        attestationId,
        reason,
        address || ''
      );

      setTxStep('confirmed');

      queryClient.invalidateQueries({ queryKey: ['trustProfile'] });
      queryClient.invalidateQueries({ queryKey: ['attestation', attestationId] });

      return updated;
    } catch (err) {
      console.error('Failed to revoke attestation:', err);
      setTxStep('error');
      setErrorMessage(translateTxError(err));
      throw err;
    } finally {
      inFlightRef.current = false;
    }
  };

  return { revoke, txStep, errorMessage, txHash };
}
