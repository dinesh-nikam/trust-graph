import React from 'react';
import { ValidityStatus } from '../../types';

interface ValidityBadgeProps {
  status: ValidityStatus;
  className?: string;
}

export const ValidityBadge: React.FC<ValidityBadgeProps> = ({ status, className = '' }) => {
  const getStyles = () => {
    switch (status) {
      case 'VALID':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 shadow-[0_0_10px_rgba(52,211,153,0.1)]';
      case 'REVOKED':
        return 'bg-rose-950/40 text-rose-400 border border-rose-900/50 shadow-[0_0_10px_rgba(251,113,133,0.1)]';
      case 'EXPIRED':
        return 'bg-amber-950/40 text-amber-400 border border-amber-900/50 shadow-[0_0_10px_rgba(251,191,36,0.1)]';
      case 'INVALID_ISSUER':
        return 'bg-neutral-900/60 text-neutral-400 border border-neutral-800';
      default:
        return 'bg-neutral-900/60 text-neutral-400 border border-neutral-800';
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold uppercase tracking-wider ${getStyles()} ${className}`}
    >
      {status.replace('_', ' ')}
    </div>
  );
};
