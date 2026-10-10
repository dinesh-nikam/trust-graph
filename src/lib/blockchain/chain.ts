import { defineChain } from 'viem';

const RPC_URL = (import.meta.env.VITE_MONAD_RPC_URL as string) || 'https://testnet-rpc.monad.xyz';
const EXPLORER_URL = 'https://testnet.monadexplorer.com';

export const MONAD_TESTNET_CHAIN_ID = 10143;

export const monadTestnet = defineChain({
  id: MONAD_TESTNET_CHAIN_ID,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_URL],
    },
    public: {
      http: [RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: EXPLORER_URL,
    },
  },
  testnet: true,
});

/**
 * Returns explorer URL for a given transaction hash.
 */
export function getExplorerTxUrl(txHash?: string): string {
  if (!txHash) return '';
  return `${EXPLORER_URL}/tx/${txHash}`;
}

/**
 * Returns explorer URL for a given account or contract address.
 */
export function getExplorerAddressUrl(address?: string): string {
  if (!address) return '';
  return `${EXPLORER_URL}/address/${address}`;
}
