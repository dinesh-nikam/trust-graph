import { monadTestnet, getExplorerTxUrl, getExplorerAddressUrl, MONAD_TESTNET_CHAIN_ID } from '../blockchain/chain';
import { TrustGraphRegistryABI, ProofOfWorkRegistryABI } from './abi';
import { getAddress, isAddress, zeroAddress } from 'viem';

const configuredRegistryAddress = import.meta.env.VITE_TRUST_GRAPH_REGISTRY_ADDRESS ||
  import.meta.env.VITE_PROOF_OF_WORK_REGISTRY_ADDRESS;

if (configuredRegistryAddress && !isAddress(configuredRegistryAddress)) {
  throw new Error('VITE_TRUST_GRAPH_REGISTRY_ADDRESS must be a valid EVM address.');
}

export const TRUST_GRAPH_REGISTRY_ADDRESS = configuredRegistryAddress
  ? getAddress(configuredRegistryAddress)
  : zeroAddress;
export const REGISTRY_ADDRESS_CONFIGURED = TRUST_GRAPH_REGISTRY_ADDRESS !== zeroAddress;

// Backwards compatibility alias
export const PROOF_OF_WORK_REGISTRY_ADDRESS = TRUST_GRAPH_REGISTRY_ADDRESS;

// Demo Wallets for testing and guided inspection
export const DEMO_WALLETS = {
  ORGANIZER: {
    address: '0x72A14b98c368d19F58bFE4e7d4d4D91F2610A91F' as `0x${string}`,
    name: 'Hackathon Organizer / Admin',
    role: 'Registry Owner',
    description: 'Can authorize and revoke reviewer privileges across TrustGraph.',
  },
  REVIEWER: {
    address: '0x92Fa656bE0656D1F08a6eD7D284976d8b948F721' as `0x${string}`,
    name: 'Ecosystem Technical Reviewer',
    role: 'Authorized Issuer',
    description: 'Authorized to review evidence manifests and issue on-chain attestations.',
  },
  DEVELOPER: {
    address: '0x3a48Bf2c8d8E02d91B0c82Ae27909A4D517e92D1' as `0x${string}`,
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

export const CONTRACT_ADDRESSES = {
  TRUST_GRAPH_REGISTRY: TRUST_GRAPH_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY: TRUST_GRAPH_REGISTRY_ADDRESS,
} as const;

export {
  monadTestnet,
  TrustGraphRegistryABI,
  ProofOfWorkRegistryABI,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  MONAD_TESTNET_CHAIN_ID,
};
