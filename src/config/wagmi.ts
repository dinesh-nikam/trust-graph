import { http, createConfig } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { monadTestnet } from './chain';

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'TrustGraph',
      },
    }),
    injected(),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
