import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { DemoModeBanner } from '../shared/DemoModeBanner';
import { TRUST_GRAPH_REGISTRY_ADDRESS, REGISTRY_ADDRESS_CONFIGURED, MONAD_TESTNET_CHAIN_ID } from '../../lib/contract/config';
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
        <div role="status" className="relative z-50 bg-amber-950 border-b border-amber-500 text-[11px] py-2 px-4 text-center text-amber-100 font-mono font-bold tracking-wide">
          [DEMO MODE: LOCAL FIXTURES - NOT COMMITTED TO MONAD TESTNET]
        </div>
      ) : (
        <div className="relative z-50 border-b border-white/[0.06] bg-neutral-950/80 text-[11px] py-1.5 px-4 text-center text-neutral-400 font-mono truncate">
          {REGISTRY_ADDRESS_CONFIGURED ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-2 align-middle" aria-hidden="true" />
              {`MONAD TESTNET CONFIGURED (Chain ID: ${MONAD_TESTNET_CHAIN_ID}) | REGISTRY: ${TRUST_GRAPH_REGISTRY_ADDRESS}`}
            </>
          ) : (
            <span className="text-amber-300">
              MONAD TESTNET REGISTRY ADDRESS IS NOT CONFIGURED. Registry reads and transactions are disabled.
            </span>
          )}
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
