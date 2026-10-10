import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { isAddress, parseEventLogs } from 'viem';
import {
  PROOF_OF_WORK_CONTRACT_CONFIG,
  MONAD_TESTNET_CHAIN_ID,
  PROOF_OF_WORK_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY_CONFIGURED,
} from '../lib/contract/config';
import { ProofOfWorkRegistryABI } from '../lib/contract/abi';
import {
  workTypeToEnumIndex,
  enumIndexToWorkType,
  enumIndexToStatus,
} from '../utils/formatters';

export type TxStep = 'idle' | 'preparing' | 'waiting-wallet' | 'submitted' | 'confirming' | 'confirmed' | 'error';

export interface OnChainWork {
  workId: `0x${string}`;
  worker: `0x${string}`;
  workType: 'SMART_CONTRACT' | 'GITHUB_CONTRIBUTION' | 'HACKATHON_PROJECT';
  evidenceHash: `0x${string}`;
  metadataUri: string;
  verifier: `0x${string}`;
  createdAt: number;
  verifiedAt: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED';
  statusReason: string;
  // Parsed metadata if available
  title?: string;
  description?: string;
}

function parseUserFriendlyError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (/user rejected|user denied/i.test(msg)) return 'Transaction was cancelled in wallet.';
    if (/insufficient funds/i.test(msg)) return 'Insufficient MON balance on Monad testnet. Obtain testnet MON at https://testnet.monad.xyz';
    if (/Caller is not an authorized verifier/i.test(msg)) return 'Caller is not an authorized verifier.';
    if (/Only registry owner/i.test(msg)) return 'Only registry owner may perform this action.';
    if (/Can only verify PENDING work/i.test(msg)) return 'Can only verify PENDING work items.';
    if (/Can only reject PENDING work/i.test(msg)) return 'Can only reject PENDING work items.';
    if (/Can only revoke VERIFIED work/i.test(msg)) return 'Can only revoke VERIFIED work items.';
    if (/Work item already registered/i.test(msg)) return 'This work ID is already registered.';
    if (/Work item does not exist/i.test(msg)) return 'Work item does not exist on-chain.';
    return msg;
  }
  return fallback;
}

function requireMonadWallet(address?: `0x${string}`, chainId?: number) {
  if (!address) throw new Error('Connect your wallet to continue.');
  if (chainId !== MONAD_TESTNET_CHAIN_ID) throw new Error('Switch your wallet to Monad Testnet (Chain ID: 10143).');
}

async function assertProofOfWorkRegistry(publicClient: ReturnType<typeof usePublicClient>) {
  if (!PROOF_OF_WORK_REGISTRY_CONFIGURED) {
    throw new Error('ProofOfWorkRegistry address is not configured.');
  }
  if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
  const rpcChainId = await publicClient.getChainId();
  if (rpcChainId !== MONAD_TESTNET_CHAIN_ID) {
    throw new Error(`RPC returned chain ID ${rpcChainId}; expected Monad Testnet (${MONAD_TESTNET_CHAIN_ID}).`);
  }
  const code = await publicClient.getCode({ address: PROOF_OF_WORK_REGISTRY_ADDRESS });
  if (!code || code === '0x') {
    throw new Error('No ProofOfWorkRegistry contract is deployed at the configured Monad Testnet address.');
  }
}

/**
 * Register Work Hook (Developer role)
 * Dispatches registerWork on Monad EVM with 5-phase transaction lifecycle
 */
export function useRegisterWork() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const register = async (input: {
    workId: `0x${string}`;
    workType: string;
    evidenceHash: `0x${string}`;
    metadataUri: string;
  }) => {
    setTxStep('preparing');
    setErrorMessage(null);

    try {
      requireMonadWallet(address, chainId);
      await assertProofOfWorkRegistry(publicClient);

      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'registerWork',
        args: [
          input.workId,
          workTypeToEnumIndex(input.workType),
          input.evidenceHash,
          input.metadataUri.trim(),
        ],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });

      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction was reverted on Monad testnet.');
      }

      const submittedEvent = parseEventLogs({
        abi: ProofOfWorkRegistryABI,
        logs: receipt.logs,
        eventName: 'WorkSubmitted',
        strict: false,
      }).find((event) =>
        event.address.toLowerCase() === PROOF_OF_WORK_CONTRACT_CONFIG.address.toLowerCase() &&
        event.args.workId?.toLowerCase() === input.workId.toLowerCase()
      );
      if (!submittedEvent) throw new Error('Confirmed transaction did not emit the expected WorkSubmitted event.');
      if (
        submittedEvent.args.worker?.toLowerCase() !== address?.toLowerCase() ||
        submittedEvent.args.evidenceHash?.toLowerCase() !== input.evidenceHash.toLowerCase() ||
        submittedEvent.args.metadataUri !== input.metadataUri.trim() ||
        Number(submittedEvent.args.workType) !== workTypeToEnumIndex(input.workType)
      ) {
        throw new Error('WorkSubmitted event fields do not match the submitted wallet and evidence.');
      }

      const stored = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWork',
        args: [input.workId],
      });
      if (
        stored.workId.toLowerCase() !== input.workId.toLowerCase() ||
        stored.worker.toLowerCase() !== address?.toLowerCase() ||
        stored.evidenceHash.toLowerCase() !== input.evidenceHash.toLowerCase() ||
        stored.metadataUri !== input.metadataUri.trim() ||
        Number(stored.workType) !== workTypeToEnumIndex(input.workType) ||
        Number(stored.status) !== 0
      ) {
        throw new Error('Confirmed work registration does not match the contract readback.');
      }

      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['allWorkIds'] }),
        queryClient.invalidateQueries({ queryKey: ['worksByWorker'] }),
        queryClient.invalidateQueries({ queryKey: ['workItem', input.workId] }),
      ]);

      return { txHash: hash, blockNumber: Number(receipt.blockNumber) };
    } catch (err: unknown) {
      console.error('Failed to register work:', err);
      setTxStep('error');
      const friendly = parseUserFriendlyError(err, 'Failed to register work on-chain.');
      setErrorMessage(friendly);
      throw new Error(friendly);
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
  };

  return {
    register,
    reset,
    txStep,
    errorMessage,
    txHash,
    isConfirming: txStep === 'confirming',
    isConfirmed: txStep === 'confirmed',
  };
}

/**
 * Verify Work Hook (Authorized Verifier role)
 * Dispatches verifyWork on Monad EVM
 */
export function useVerifyWork() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const verify = async (workId: `0x${string}`) => {
    setTxStep('preparing');
    setErrorMessage(null);

    try {
      requireMonadWallet(address, chainId);
      if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
      await assertProofOfWorkRegistry(publicClient);

      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'verifyWork',
        args: [workId],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });

      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction was reverted on Monad testnet.');
      }

      const verifiedEvent = parseEventLogs({
        abi: ProofOfWorkRegistryABI,
        logs: receipt.logs,
        eventName: 'WorkVerified',
        strict: false,
      }).find((event) =>
        event.address.toLowerCase() === PROOF_OF_WORK_CONTRACT_CONFIG.address.toLowerCase() &&
        event.args.workId?.toLowerCase() === workId.toLowerCase() &&
        event.args.verifier?.toLowerCase() === address?.toLowerCase()
      );
      if (!verifiedEvent) throw new Error('Confirmed transaction did not emit the expected WorkVerified event.');
      const stored = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWork',
        args: [workId],
      });
      if (Number(stored.status) !== 1 || stored.verifier.toLowerCase() !== address?.toLowerCase()) {
        throw new Error('Confirmed verification is not reflected by the registry readback.');
      }

      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['allWorkIds'] }),
        queryClient.invalidateQueries({ queryKey: ['worksByWorker'] }),
        queryClient.invalidateQueries({ queryKey: ['workItem', workId] }),
        queryClient.invalidateQueries({ queryKey: ['verifierQueue'] }),
      ]);

      return { txHash: hash, blockNumber: Number(receipt.blockNumber) };
    } catch (err: unknown) {
      console.error('Failed to verify work:', err);
      setTxStep('error');
      const friendly = parseUserFriendlyError(err, 'Failed to verify work on-chain.');
      setErrorMessage(friendly);
      throw new Error(friendly);
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
  };

  return {
    verify,
    reset,
    txStep,
    errorMessage,
    txHash,
    isConfirming: txStep === 'confirming',
    isConfirmed: txStep === 'confirmed',
  };
}

/**
 * Reject Work Hook (Authorized Verifier role)
 * Dispatches rejectWork on Monad EVM with mandatory reason
 */
export function useRejectWork() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const reject = async (workId: `0x${string}`, reason: string) => {
    if (!reason.trim()) throw new Error('A rejection reason is required.');
    setTxStep('preparing');
    setErrorMessage(null);

    try {
      requireMonadWallet(address, chainId);
      if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
      await assertProofOfWorkRegistry(publicClient);

      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'rejectWork',
        args: [workId, reason.trim()],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });

      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction was reverted on Monad testnet.');
      }

      const rejectedEvent = parseEventLogs({
        abi: ProofOfWorkRegistryABI,
        logs: receipt.logs,
        eventName: 'WorkRejected',
        strict: false,
      }).find((event) =>
        event.address.toLowerCase() === PROOF_OF_WORK_CONTRACT_CONFIG.address.toLowerCase() &&
        event.args.workId?.toLowerCase() === workId.toLowerCase() &&
        event.args.verifier?.toLowerCase() === address?.toLowerCase() &&
        event.args.reason === reason.trim()
      );
      if (!rejectedEvent) throw new Error('Confirmed transaction did not emit the expected WorkRejected event.');
      const stored = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWork',
        args: [workId],
      });
      if (Number(stored.status) !== 2 || stored.verifier.toLowerCase() !== address?.toLowerCase() || stored.statusReason !== reason.trim()) {
        throw new Error('Confirmed rejection is not reflected by the registry readback.');
      }

      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['allWorkIds'] }),
        queryClient.invalidateQueries({ queryKey: ['worksByWorker'] }),
        queryClient.invalidateQueries({ queryKey: ['workItem', workId] }),
        queryClient.invalidateQueries({ queryKey: ['verifierQueue'] }),
      ]);

      return { txHash: hash, blockNumber: Number(receipt.blockNumber) };
    } catch (err: unknown) {
      console.error('Failed to reject work:', err);
      setTxStep('error');
      const friendly = parseUserFriendlyError(err, 'Failed to reject work on-chain.');
      setErrorMessage(friendly);
      throw new Error(friendly);
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
  };

  return {
    reject,
    reset,
    txStep,
    errorMessage,
    txHash,
    isConfirming: txStep === 'confirming',
    isConfirmed: txStep === 'confirmed',
  };
}

/**
 * Revoke Work Hook (Authorized Verifier role)
 * Dispatches revokeWork on Monad EVM with mandatory reason
 */
export function useRevokeWork() {
  const queryClient = useQueryClient();
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const revoke = async (workId: `0x${string}`, reason: string) => {
    if (!reason.trim()) throw new Error('A revocation reason is required.');
    setTxStep('preparing');
    setErrorMessage(null);

    try {
      requireMonadWallet(address, chainId);
      if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
      await assertProofOfWorkRegistry(publicClient);

      setTxStep('waiting-wallet');
      const hash = await writeContractAsync({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'revokeWork',
        args: [workId, reason.trim()],
        chainId: MONAD_TESTNET_CHAIN_ID,
      });

      setTxHash(hash);
      setTxStep('submitted');
      setTxStep('confirming');

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error('Transaction was reverted on Monad testnet.');
      }

      const revokedEvent = parseEventLogs({
        abi: ProofOfWorkRegistryABI,
        logs: receipt.logs,
        eventName: 'WorkRevoked',
        strict: false,
      }).find((event) =>
        event.address.toLowerCase() === PROOF_OF_WORK_CONTRACT_CONFIG.address.toLowerCase() &&
        event.args.workId?.toLowerCase() === workId.toLowerCase() &&
        event.args.verifier?.toLowerCase() === address?.toLowerCase() &&
        event.args.reason === reason.trim()
      );
      if (!revokedEvent) throw new Error('Confirmed transaction did not emit the expected WorkRevoked event.');
      const stored = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWork',
        args: [workId],
      });
      if (Number(stored.status) !== 3 || stored.verifier.toLowerCase() !== address?.toLowerCase() || stored.statusReason !== reason.trim()) {
        throw new Error('Confirmed revocation is not reflected by the registry readback.');
      }

      setTxStep('confirmed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['allWorkIds'] }),
        queryClient.invalidateQueries({ queryKey: ['worksByWorker'] }),
        queryClient.invalidateQueries({ queryKey: ['workItem', workId] }),
        queryClient.invalidateQueries({ queryKey: ['verifierQueue'] }),
      ]);

      return { txHash: hash, blockNumber: Number(receipt.blockNumber) };
    } catch (err: unknown) {
      console.error('Failed to revoke work:', err);
      setTxStep('error');
      const friendly = parseUserFriendlyError(err, 'Failed to revoke work on-chain.');
      setErrorMessage(friendly);
      throw new Error(friendly);
    }
  };

  const reset = () => {
    setTxStep('idle');
    setErrorMessage(null);
    setTxHash(undefined);
  };

  return {
    revoke,
    reset,
    txStep,
    errorMessage,
    txHash,
    isConfirming: txStep === 'confirming',
    isConfirmed: txStep === 'confirmed',
  };
}

/**
 * Query a specific work item by workId
 */
export function useWorkItem(workId?: string) {
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  return useQuery({
    queryKey: ['workItem', workId],
    queryFn: async (): Promise<OnChainWork | null> => {
      if (!workId || !publicClient) return null;
      if (!workId.startsWith('0x') || workId.length !== 66) return null;
      await assertProofOfWorkRegistry(publicClient);
      const raw = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWork',
        args: [workId as `0x${string}`],
      });

      return {
        workId: raw.workId,
        worker: raw.worker,
        workType: enumIndexToWorkType(Number(raw.workType)),
        evidenceHash: raw.evidenceHash,
        metadataUri: raw.metadataUri,
        verifier: raw.verifier,
        createdAt: Number(raw.createdAt),
        verifiedAt: Number(raw.verifiedAt),
        status: enumIndexToStatus(Number(raw.status)),
        statusReason: raw.statusReason,
      };
    },
    enabled: Boolean(workId && workId.startsWith('0x') && workId.length === 66),
    refetchInterval: 15_000,
  });
}

/**
 * Check if address is authorized verifier
 */
export function useVerifierStatus(address?: string) {
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  const query = useQuery({
    queryKey: ['isVerifier', address?.toLowerCase()],
    queryFn: async (): Promise<boolean> => {
      if (!address || !isAddress(address, { strict: false })) return false;
      await assertProofOfWorkRegistry(publicClient);
      return publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'isVerifier',
        args: [address],
      });
    },
    enabled: Boolean(address && isAddress(address, { strict: false })),
    refetchInterval: 15_000,
  });

  return { isVerifier: query.data === true, isLoading: query.isLoading, error: query.error };
}

/**
 * Query verifier triage queue
 * Optimized with batch chunked reads to scale to thousands of submissions without N+1 RPC round trips
 */
export function useVerifierQueue() {
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  const query = useQuery({
    queryKey: ['verifierQueue'],
    queryFn: async (): Promise<{
      works: OnChainWork[];
      pendingWorks: OnChainWork[];
      verifiedWorks: OnChainWork[];
      rejectedWorks: OnChainWork[];
      revokedWorks: OnChainWork[];
    }> => {
      if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
      await assertProofOfWorkRegistry(publicClient);

      let items: OnChainWork[] = [];
      try {
        const ids = await publicClient.readContract({
          address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
          abi: ProofOfWorkRegistryABI,
          functionName: 'getAllWorkIds',
        });

        if (ids.length === 0) {
          items = [];
        } else {
          // Batch in chunks of 50 to scale safely without hitting single RPC payload limits
          const CHUNK_SIZE = 50;
          const chunks: (readonly `0x${string}`[])[] = [];
          for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            chunks.push(ids.slice(i, i + CHUNK_SIZE));
          }

          const rawBatches = await Promise.all(
            chunks.map((chunk) =>
              publicClient.readContract({
                address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
                abi: ProofOfWorkRegistryABI,
                functionName: 'getWorks',
                args: [chunk as `0x${string}`[]],
              })
            )
          );

          items = rawBatches.flat().map((raw) => ({
            workId: raw.workId,
            worker: raw.worker,
            workType: enumIndexToWorkType(Number(raw.workType)),
            evidenceHash: raw.evidenceHash,
            metadataUri: raw.metadataUri,
            verifier: raw.verifier,
            createdAt: Number(raw.createdAt),
            verifiedAt: Number(raw.verifiedAt),
            status: enumIndexToStatus(Number(raw.status)),
            statusReason: raw.statusReason,
          }));
        }
      } catch (batchErr) {
        // Resilient fallback to individual reads
        console.warn('Batch getWorks read fallback to individual reads:', batchErr);
        const ids = await publicClient.readContract({
          address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
          abi: ProofOfWorkRegistryABI,
          functionName: 'getAllWorkIds',
        });
        items = await Promise.all(
          ids.map(async (id): Promise<OnChainWork> => {
            const raw = await publicClient.readContract({
              address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
              abi: ProofOfWorkRegistryABI,
              functionName: 'getWork',
              args: [id],
            });
            return {
              workId: raw.workId,
              worker: raw.worker,
              workType: enumIndexToWorkType(Number(raw.workType)),
              evidenceHash: raw.evidenceHash,
              metadataUri: raw.metadataUri,
              verifier: raw.verifier,
              createdAt: Number(raw.createdAt),
              verifiedAt: Number(raw.verifiedAt),
              status: enumIndexToStatus(Number(raw.status)),
              statusReason: raw.statusReason,
            };
          })
        );
      }

      const works = items;
      return {
        works,
        pendingWorks: works.filter((w) => w.status === 'PENDING'),
        verifiedWorks: works.filter((w) => w.status === 'VERIFIED'),
        rejectedWorks: works.filter((w) => w.status === 'REJECTED'),
        revokedWorks: works.filter((w) => w.status === 'REVOKED'),
      };
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  return {
    ...query,
    works: query.data?.works || [],
    pendingWorks: query.data?.pendingWorks || [],
    verifiedWorks: query.data?.verifiedWorks || [],
    rejectedWorks: query.data?.rejectedWorks || [],
    revokedWorks: query.data?.revokedWorks || [],
  };
}

/**
 * Paginated verifier queue hook for high-scale triage
 * Fetches page by page in a single O(1) RPC call instead of loading the entire registry
 */
export function useVerifierQueuePaginated(page = 0, pageSize = 20) {
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  return useQuery({
    queryKey: ['verifierQueuePaginated', page, pageSize],
    queryFn: async (): Promise<{
      items: OnChainWork[];
      total: number;
      totalPages: number;
    }> => {
      if (!publicClient) throw new Error('Monad Testnet RPC is unavailable.');
      await assertProofOfWorkRegistry(publicClient);

      const offset = BigInt(page * pageSize);
      const limit = BigInt(pageSize);

      const [rawItems, totalCount] = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWorksPaginated',
        args: [offset, limit],
      });

      const total = Number(totalCount);
      const items: OnChainWork[] = rawItems.map((raw) => ({
        workId: raw.workId,
        worker: raw.worker,
        workType: enumIndexToWorkType(Number(raw.workType)),
        evidenceHash: raw.evidenceHash,
        metadataUri: raw.metadataUri,
        verifier: raw.verifier,
        createdAt: Number(raw.createdAt),
        verifiedAt: Number(raw.verifiedAt),
        status: enumIndexToStatus(Number(raw.status)),
        statusReason: raw.statusReason,
      }));

      return {
        items,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Paginated developer works hook
 */
export function useWorksByWorkerPaginated(worker?: string, page = 0, pageSize = 20) {
  const publicClient = usePublicClient({ chainId: MONAD_TESTNET_CHAIN_ID });

  return useQuery({
    queryKey: ['worksByWorkerPaginated', worker?.toLowerCase(), page, pageSize],
    queryFn: async (): Promise<{
      items: OnChainWork[];
      total: number;
      totalPages: number;
    }> => {
      if (!worker || !isAddress(worker, { strict: false }) || !publicClient) {
        return { items: [], total: 0, totalPages: 0 };
      }
      await assertProofOfWorkRegistry(publicClient);

      const offset = BigInt(page * pageSize);
      const limit = BigInt(pageSize);

      const [rawItems, totalCount] = await publicClient.readContract({
        address: PROOF_OF_WORK_CONTRACT_CONFIG.address,
        abi: ProofOfWorkRegistryABI,
        functionName: 'getWorksByWorkerPaginated',
        args: [worker, offset, limit],
      });

      const total = Number(totalCount);
      const items: OnChainWork[] = rawItems.map((raw) => ({
        workId: raw.workId,
        worker: raw.worker,
        workType: enumIndexToWorkType(Number(raw.workType)),
        evidenceHash: raw.evidenceHash,
        metadataUri: raw.metadataUri,
        verifier: raw.verifier,
        createdAt: Number(raw.createdAt),
        verifiedAt: Number(raw.verifiedAt),
        status: enumIndexToStatus(Number(raw.status)),
        statusReason: raw.statusReason,
      }));

      return {
        items,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    enabled: Boolean(worker && isAddress(worker, { strict: false })),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Composite actions for work lifecycle
 */
export function useWorkActions() {
  const registerHook = useRegisterWork();
  const verifyHook = useVerifyWork();
  const rejectHook = useRejectWork();
  const revokeHook = useRevokeWork();

  return {
    register: registerHook.register,
    verify: verifyHook.verify,
    reject: rejectHook.reject,
    revoke: revokeHook.revoke,
    isLoading:
      registerHook.isConfirming ||
      verifyHook.isConfirming ||
      rejectHook.isConfirming ||
      revokeHook.isConfirming,
    registerState: registerHook,
    verifyState: verifyHook,
    rejectState: rejectHook,
    revokeState: revokeHook,
  };
}

import { useTrustProfile } from './useTrustGraph';
export const usePassport = useTrustProfile;

export {
  useTrustProfile,
  useAttestation,
  useAllAttestations,
  useIssueAttestation,
  useRevokeAttestation,
  useIssuerStatus,
} from './useTrustGraph';

