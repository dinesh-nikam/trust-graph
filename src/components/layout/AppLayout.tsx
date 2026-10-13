import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { DemoModeBanner } from '../shared/DemoModeBanner';
import {
  TRUST_GRAPH_REGISTRY_ADDRESS,
  REGISTRY_ADDRESS_CONFIGURED,
  MONAD_TESTNET_CHAIN_ID,
  PROOF_OF_WORK_REGISTRY_ADDRESS,
  PROOF_OF_WORK_REGISTRY_CONFIGURED,
} from '../../lib/contract/config';
import { shortenAddress } from '../../utils/formatters';
import trustGraphService from '../../services/trustGraphService';

export const AppLayout: React.FC = () => {
  const [mode, setMode] = useState<'LIVE' | 'DEMO'>(trustGraphService.getMode());

  useEffect(() => {
    const refreshMode = () => setMode(trustGraphService.getMode());
    window.addEventListener('storage', refreshMode);
    return () => window.removeEventListener('storage', refreshMode);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30 selection:text-primary-bright">
      <DemoModeBanner />

      {/* Protocol status strip */}
      <div className="border-b border-surface-border bg-surface-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-ink-dim">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            Monad Testnet · Chain 10143
          </span>
          <span className="hidden sm:inline">
            Registry <span className="text-ink-muted">{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 4)}</span>
          </span>
        </div>
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
            {`MONAD TESTNET (Chain ID: ${MONAD_TESTNET_CHAIN_ID}) · ATTESTATION REGISTRY: ${REGISTRY_ADDRESS_CONFIGURED ? TRUST_GRAPH_REGISTRY_ADDRESS : 'NOT CONFIGURED'} · WORK REGISTRY: ${PROOF_OF_WORK_REGISTRY_CONFIGURED ? PROOF_OF_WORK_REGISTRY_ADDRESS : 'NOT CONFIGURED'}`}
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
