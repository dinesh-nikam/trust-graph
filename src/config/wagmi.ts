import { http, createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { monadTestnet } from './chain';

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
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
