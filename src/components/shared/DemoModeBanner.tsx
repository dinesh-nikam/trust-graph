import React from 'react';
import { Cpu } from 'lucide-react';

/**
 * Persistent, unconditional notice. The application has no on-chain read path
 * yet, so every record shown is sourced from local fixtures. This banner is
 * never hidden — hiding it would let local fixtures read as live registry data.
 */
export const DemoModeBanner: React.FC = () => {
  return (
    <div
      className="bg-surface-subtle border-b border-amber-500/25"
      role="status"
    >
      <div className="w-full py-1.5 px-4 flex items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-300/90">
        <Cpu className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>[DEMO MODE: LOCAL FIXTURES — NOT COMMITTED TO MONAD TESTNET]</span>
      </div>
    </div>
  );
};
