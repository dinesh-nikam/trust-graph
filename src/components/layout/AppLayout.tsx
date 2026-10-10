import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import {
  TRUST_GRAPH_REGISTRY_ADDRESS,
  REGISTRY_ADDRESS_CONFIGURED,
  PROOF_OF_WORK_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY_CONFIGURED,
  MONAD_TESTNET_CHAIN_ID,
} from '../../lib/contract/config';
import { trustGraphService } from '../../services/trustGraphService';
import { useContractStatus } from '../../hooks/useTrustGraph';

export const AppLayout: React.FC = () => {
  const [mode, setMode] = useState<'LIVE' | 'DEMO'>(trustGraphService.getMode());
  const { data: contractStatus } = useContractStatus();

  useEffect(() => {
    const refreshMode = () => setMode(trustGraphService.getMode());
    window.addEventListener('storage', refreshMode);
    return () => window.removeEventListener('storage', refreshMode);
  }, []);

  const powStatus = contractStatus?.proofOfWorkReady ? 'CONTRACT_READY' : 'VERIFYING...';
  const tgStatus = contractStatus?.trustGraphReady ? 'CONTRACT_READY' : 'CONTRACT_NOT_DEPLOYED';

  return (
    <div className="relative min-h-screen flex flex-col bg-background isolate">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 ambient-glow" />
        <div className="absolute inset-x-0 top-0 h-[900px] bg-grid-pattern" />
        <div className="absolute inset-0 noise-overlay" />
      </div>

      {mode === 'DEMO' ? (
        <div role="status" className="relative z-50 bg-amber-950/90 border-b border-amber-500/50 backdrop-blur-md text-[11px] py-1.5 px-4 text-center text-amber-200 font-mono font-semibold tracking-wider flex items-center justify-center gap-2 shadow-[0_1px_12px_rgba(245,158,11,0.15)]">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
          <span>[DEMO MODE: LOCAL FIXTURES - NOT COMMITTED TO MONAD TESTNET]</span>
        </div>
      ) : (
        <div className="relative z-50 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-md text-[11px] py-1.5 px-4 text-center text-neutral-400 font-mono truncate flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          <span>
            {`MONAD TESTNET (${MONAD_TESTNET_CHAIN_ID}) · WORK REGISTRY: ${powStatus} (${PROOF_OF_WORK_REGISTRY_CONFIGURED ? PROOF_OF_WORK_REGISTRY_ADDRESS : 'NOT CONFIGURED'}) · ATTESTATION REGISTRY: ${tgStatus}`}
          </span>
        </div>
      )}

      <Navbar />

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
