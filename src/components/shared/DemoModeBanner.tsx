import React from 'react';
import { Cpu } from 'lucide-react';
import { trustGraphService } from '../../services/trustGraphService';

export const DemoModeBanner: React.FC = () => {
  if (trustGraphService.getMode() === 'LIVE') return null;

  return (
    <div className="w-full bg-amber-950/80 border-b border-amber-500/30 text-amber-200 py-1.5 px-4 flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest z-50">
      <Cpu className="h-3.5 w-3.5" />
      <span>[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]</span>
    </div>
  );
};
