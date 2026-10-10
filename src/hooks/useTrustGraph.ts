import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseEventLogs } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { Attestation, ClaimType, TrustProfile } from '../types';
import { trustGraphService } from '../services/trustGraphService';
import { CONTRACT_CONFIG, MONAD_TESTNET_CHAIN_ID, TRUST_GRAPH_REGISTRY_ADDRESS } from '../lib/contract/config';
import { stringToBytes32 } from '../utils/formatters';

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

export function useContractStatus() {
  return useQuery({
    queryKey: ['contractStatus'],
    queryFn: () => trustGraphService.getContractStatus(),
    refetchInterval: 30_000,
  });
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
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [createdAttestation, setCreatedAttestation] = useState<Attestation | null>(null);

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
    setTxStep('preparing');
    setErrorMessage(null);
    setCreatedAttestation(null);
    try {
      requireMonadWallet(address, chainId);
      if (!publicClient) throw new Error('Monad Testnet RPC client is unavailable.');
      const rpcChainId = await publicClient.getChainId();
      if (rpcChainId !== MONAD_TESTNET_CHAIN_ID) throw new Error(`RPC returned chain ID ${rpcChainId}; expected ${MONAD_TESTNET_CHAIN_ID}.`);
      const registryCode = await publicClient.getCode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
      if (!registryCode || registryCode === '0x') throw new Error('No registry contract is deployed at the configured Monad Testnet address. Transaction was not sent.');
      if (!/^0x[0-9a-fA-F]{40}$/.test(input.subject)) throw new Error('Enter a valid subject wallet address.');
      if (!input.evidenceUrl.trim() || input.evidenceHash === `0x${'0'.repeat(64)}`) throw new Error('Evidence URL and evidence hash are required.');

      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: TRUST_GRAPH_REGISTRY_ADDRESS,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'issueAttestation',
        args: [input.subject, stringToBytes32(input.claimType), input.evidenceHash, input.evidenceUrl.trim(), BigInt(input.expiry || 0)],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });
      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Monad rejected the issuance transaction.');
      const [issued] = parseEventLogs({
        abi: CONTRACT_CONFIG.abi,
        logs: receipt.logs,
        eventName: 'AttestationIssued',
        strict: false,
      }).filter((log) => log.address.toLowerCase() === TRUST_GRAPH_REGISTRY_ADDRESS.toLowerCase());
      const id = issued?.args?.id;
      if (id === undefined) throw new Error('Confirmed transaction did not contain an AttestationIssued event.');
      const attestation = await trustGraphService.getAttestationById(id.toString());
      if (!attestation) throw new Error('Confirmed transaction is not readable from the configured registry.');

      setCreatedAttestation({ ...attestation, transactionHash: hash, blockNumber: Number(receipt.blockNumber) });
      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trustProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['attestation'] }),
      ]);
      return { ...attestation, transactionHash: hash, blockNumber: Number(receipt.blockNumber) };
    } catch (error) {
      console.error('Failed to issue attestation:', error);
      setTxStep('error');
      setErrorMessage(errorText(error, 'Issuance failed.'));
      throw error;
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
    setCreatedAttestation(null);
  };

  return { issue, reset, txStep, errorMessage, txHash, isConfirming: txStep === 'confirming', isConfirmed: txStep === 'confirmed', createdAttestation };
}

export function useRevokeAttestation() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const revoke = async (attestationId: string, reason: string) => {
    setTxStep('preparing');
    setErrorMessage(null);
    try {
      requireMonadWallet(address, chainId);
      if (!publicClient) throw new Error('Monad Testnet RPC client is unavailable.');
      const rpcChainId = await publicClient.getChainId();
      if (rpcChainId !== MONAD_TESTNET_CHAIN_ID) throw new Error(`RPC returned chain ID ${rpcChainId}; expected ${MONAD_TESTNET_CHAIN_ID}.`);
      const registryCode = await publicClient.getCode({ address: TRUST_GRAPH_REGISTRY_ADDRESS });
      if (!registryCode || registryCode === '0x') throw new Error('No registry contract is deployed at the configured Monad Testnet address. Transaction was not sent.');
      if (!/^\d+$/.test(attestationId) || BigInt(attestationId) < 1n) throw new Error('Enter a valid attestation ID.');
      if (!reason.trim()) throw new Error('A revocation reason is required.');
      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: TRUST_GRAPH_REGISTRY_ADDRESS,
        abi: CONTRACT_CONFIG.abi,
        functionName: 'revokeAttestation',
        args: [BigInt(attestationId), reason.trim()],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });
      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error('Monad rejected the revocation transaction.');
      const updated = await trustGraphService.getAttestationById(attestationId);
      if (!updated || updated.validity !== 'REVOKED') throw new Error('Confirmed revocation is not reflected by the registry read.');
      const result = { ...updated, transactionHash: hash, blockNumber: Number(receipt.blockNumber) };
      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trustProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['attestation', attestationId] }),
      ]);
      return result;
    } catch (error) {
      console.error('Failed to revoke attestation:', error);
      setTxStep('error');
      setErrorMessage(errorText(error, 'Revocation failed.'));
      throw error;
    }
  };

  return { revoke, txStep, errorMessage, txHash };
}
