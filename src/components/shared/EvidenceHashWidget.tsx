import React from 'react';
import { Fingerprint, CheckCircle2 } from 'lucide-react';
import { ValidityStatus } from '../../types';

interface EvidenceHashWidgetProps {
  hash: string;
  status: ValidityStatus;
}

export const EvidenceHashWidget: React.FC<EvidenceHashWidgetProps> = ({ hash, status }) => {
  const isValid = status === 'VALID';

  return (
    <div className="w-full border border-neutral-800 bg-[#0a0a0c] p-4 flex flex-col gap-3 relative overflow-hidden group">
      {/* Background glow effect for valid hashes */}
      {isValid && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] pointer-events-none rounded-full" />
      )}
      
      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
        <div className="flex items-center gap-2 text-neutral-400">
          <Fingerprint className="h-4 w-4" />
          <span className="text-[11px] font-mono uppercase tracking-widest">Cryptographic Evidence Hash</span>
        </div>
        {isValid && (
          <div className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Verified Match</span>
          </div>
        )}
      </div>

      <div className="font-mono text-sm sm:text-base text-neutral-300 break-all leading-relaxed relative z-10 selection:bg-emerald-900/50 selection:text-emerald-200">
        {hash}
      </div>
    </div>
  );
};
