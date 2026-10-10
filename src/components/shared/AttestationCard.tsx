import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Clock, ShieldCheck, Box } from 'lucide-react';
import { Attestation } from '../../types';
import { ValidityBadge } from './ValidityBadge';
import { shortenAddress } from '../../utils/formatters';

interface AttestationCardProps {
  attestation: Attestation;
}

export const AttestationCard: React.FC<AttestationCardProps> = ({ attestation }) => {
  return (
    <div className="group relative w-full border border-neutral-800 bg-[#0a0a0c] p-5 hover:border-neutral-700 transition-colors flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ValidityBadge status={attestation.validity} />
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(attestation.issuedAt * 1000).toLocaleDateString()}
          </div>
        </div>
        <Link 
          to={`/verify/${attestation.id}`}
          className="text-[11px] font-mono text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors uppercase tracking-widest"
        >
          Inspect Proof <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-2">
        <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
          {attestation.claimType.replace('_', ' ')}
        </div>
        <h3 className="text-lg font-medium text-neutral-200 group-hover:text-white transition-colors leading-tight">
          {attestation.claimTitle}
        </h3>
        <p className="text-sm text-neutral-400 line-clamp-2 leading-relaxed">
          {attestation.claimDescription}
        </p>
      </div>

      {/* Footer Info */}
      <div className="pt-4 mt-auto border-t border-neutral-900 grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Issuer</span>
          <Link to={`/profile/${attestation.issuer}`} className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white">
            <ShieldCheck className={`h-3.5 w-3.5 ${attestation.issuerAuthorized ? 'text-emerald-500' : 'text-neutral-500'}`} />
            <span className="font-mono">{shortenAddress(attestation.issuer)}</span>
          </Link>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Subject</span>
          <Link to={`/profile/${attestation.subject}`} className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white">
            <Box className="h-3.5 w-3.5 text-neutral-500" />
            <span className="font-mono">{shortenAddress(attestation.subject)}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
