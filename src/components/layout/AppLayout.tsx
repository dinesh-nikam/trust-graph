import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { DemoModeBanner } from '../shared/DemoModeBanner';
import { TRUST_GRAPH_REGISTRY_ADDRESS } from '../../lib/contract/config';
import { shortenAddress } from '../../utils/formatters';

export const AppLayout: React.FC = () => {
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

      <Navbar />

      <main className="flex-1 pb-16">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
};
