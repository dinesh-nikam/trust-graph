import { monadTestnet, getExplorerTxUrl, getExplorerAddressUrl, MONAD_TESTNET_CHAIN_ID } from '../blockchain/chain';
import { TrustGraphRegistryABI, ProofOfWorkRegistryABI } from './abi';
import { getAddress, isAddress, zeroAddress } from 'viem';

const configuredTrustGraphAddress = import.meta.env.VITE_TRUST_GRAPH_REGISTRY_ADDRESS || '0x2F8E77A048E55c2c2866721d0735ccA9012BB52A';
const configuredProofOfWorkAddress = import.meta.env.VITE_PROOF_OF_WORK_REGISTRY_ADDRESS || '0xca65ada83f1f7765a712b28a6b79ca323395f8ac';

// if (configuredTrustGraphAddress && !isAddress(configuredTrustGraphAddress, { strict: false })) {
//   throw new Error('VITE_TRUST_GRAPH_REGISTRY_ADDRESS must be a valid EVM address.');
// }
// 
// if (configuredProofOfWorkAddress && !isAddress(configuredProofOfWorkAddress, { strict: false })) {
//   throw new Error('VITE_PROOF_OF_WORK_REGISTRY_ADDRESS must be a valid EVM address.');
// }

export const TRUST_GRAPH_REGISTRY_ADDRESS = (configuredTrustGraphAddress && isAddress(configuredTrustGraphAddress, { strict: false }))
  ? getAddress(configuredTrustGraphAddress)
  : zeroAddress;
export const PROOF_OF_WORK_REGISTRY_ADDRESS = (configuredProofOfWorkAddress && isAddress(configuredProofOfWorkAddress, { strict: false }))
  ? getAddress(configuredProofOfWorkAddress)
  : zeroAddress;
export const REGISTRY_ADDRESS_CONFIGURED = TRUST_GRAPH_REGISTRY_ADDRESS !== zeroAddress;
export const PROOF_OF_WORK_REGISTRY_CONFIGURED = PROOF_OF_WORK_REGISTRY_ADDRESS !== zeroAddress;

// Demo Wallets for testing and guided inspection
export const DEMO_WALLETS = {
  ORGANIZER: {
    address: '0x72A14B98C368D19f58BFE4E7d4d4D91F2610A91f' as `0x${string}`,
    name: 'Hackathon Organizer / Admin',
    role: 'Registry Owner',
    description: 'Can authorize and revoke reviewer privileges across TrustGraph.',
  },
  REVIEWER: {
    address: '0x92fA656Be0656D1f08a6eD7d284976d8b948F721' as `0x${string}`,
    name: 'Ecosystem Technical Reviewer',
    role: 'Authorized Issuer',
    description: 'Authorized to review evidence manifests and issue on-chain attestations.',
  },
  DEVELOPER: {
    address: '0x3a48bF2C8d8E02D91b0C82AE27909a4d517e92d1' as `0x${string}`,
    name: 'Developer Sarah',
    role: 'Subject',
    description: 'Active builder with claims backed by inspectable smart contract and commit evidence.',
  },
} as const;

export const CONTRACT_CONFIG = {
  chainId: MONAD_TESTNET_CHAIN_ID,
  chain: monadTestnet,
  address: TRUST_GRAPH_REGISTRY_ADDRESS,
  abi: TrustGraphRegistryABI,
} as const;

export const PROOF_OF_WORK_CONTRACT_CONFIG = {
  chainId: MONAD_TESTNET_CHAIN_ID,
  chain: monadTestnet,
  address: PROOF_OF_WORK_REGISTRY_ADDRESS,
  abi: ProofOfWorkRegistryABI,
} as const;

export const CONTRACT_ADDRESSES = {
  TRUST_GRAPH_REGISTRY: TRUST_GRAPH_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY: PROOF_OF_WORK_REGISTRY_ADDRESS,
} as const;

export {
  monadTestnet,
  TrustGraphRegistryABI,
  ProofOfWorkRegistryABI,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  MONAD_TESTNET_CHAIN_ID,
};
