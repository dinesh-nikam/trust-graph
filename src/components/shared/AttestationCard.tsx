import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldCheck, Box, ArrowUpRight } from 'lucide-react';
import { Attestation } from '../../types';
import { ValidityBadge } from './ValidityBadge';
import { shortenAddress, formatDate, getClaimTypeDetails } from '../../utils/formatters';
import { cn } from '../../utils/cn';
import { fadeRise, settleTransition } from '../../lib/motion';

interface AttestationCardProps {
  attestation: Attestation;
  /** Position in a list — drives stagger delay */
  index?: number;
}

export const AttestationCard: React.FC<AttestationCardProps> = ({ attestation, index = 0 }) => {
  const shouldReduceMotion = useReducedMotion();
  const claim = getClaimTypeDetails(attestation.claimType);

  return (
    <motion.article
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      variants={fadeRise}
      transition={{ ...settleTransition, delay: shouldReduceMotion ? 0 : index * 0.05 }}
      className="group relative bg-surface border border-surface-border corner-ticks corner-ticks-accent transition-colors duration-200 hover:border-surface-border-strong flex flex-col"
    >
      {/* Ledger head: id · claim tag · validity */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4">
        <span className="font-mono text-[10px] text-ink-dim tracking-widest-xl">№{attestation.id}</span>
        <span
          className={cn(
            'inline-flex items-center px-1.5 py-0.5 border font-mono text-[10px] uppercase tracking-widest',
            claim.tagBg
          )}
        >
          {claim.shortLabel}
        </span>
        <span className="ml-auto">
          <ValidityBadge status={attestation.validity} />
        </span>
      </div>

      {/* Title & description */}
      <div className="px-5 pt-3 pb-4 flex flex-col gap-1.5">
        <h3 className="text-base font-medium text-ink leading-snug">{attestation.claimTitle}</h3>
        <p className="text-sm text-ink-muted line-clamp-2 leading-relaxed">
          {attestation.claimDescription}
        </p>
      </div>

      {/* Hairline ledger footer */}
      <div className="mt-auto border-t border-surface-border grid grid-cols-2 divide-x divide-surface-border">
        <div className="px-5 py-3 flex flex-col gap-1">
          <span className="font-mono text-[9px] text-ink-dim uppercase tracking-widest-xl">Issuer</span>
          <Link
            to={`/profile/${attestation.issuer}`}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-primary-bright transition-colors w-fit"
          >
            <ShieldCheck
              className={cn('h-3.5 w-3.5', attestation.issuerAuthorized ? 'text-emerald-500' : 'text-ink-dim')}
              aria-hidden="true"
            />
            {shortenAddress(attestation.issuer)}
          </Link>
        </div>
        <div className="px-5 py-3 flex flex-col gap-1">
          <span className="font-mono text-[9px] text-ink-dim uppercase tracking-widest-xl">Subject</span>
          <Link
            to={`/profile/${attestation.subject}`}
            className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-muted hover:text-primary-bright transition-colors w-fit"
          >
            <Box className="h-3.5 w-3.5 text-ink-dim" aria-hidden="true" />
            {shortenAddress(attestation.subject)}
          </Link>
        </div>
      </div>

      {/* Bottom strip: date + inspect */}
      <div className="flex items-center justify-between gap-3 border-t border-surface-border px-5 py-2.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-ink-dim tracking-widest uppercase truncate">
            Issued {formatDate(attestation.issuedAt)}
          </span>
          {!attestation.transactionHash && (
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-status-pending/40 text-status-pending bg-status-pending/[0.07]">
              Local Fixture
            </span>
          )}
        </span>
        <Link
          to={`/verify/${attestation.id}`}
          className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-evidence hover:text-evidence/80 transition-colors focus-visible:text-evidence"
          aria-label={`Inspect proof №${attestation.id}`}
        >
          Inspect Proof
          <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Left edge indicator in claim-type hue */}
      <span
        className={cn(
          'absolute left-0 top-0 bottom-0 w-px opacity-40 group-hover:opacity-90 transition-opacity',
          attestation.validity === 'VALID' && 'bg-status-verified',
          attestation.validity === 'REVOKED' && 'bg-status-revoked',
          attestation.validity === 'EXPIRED' && 'bg-status-expired',
          attestation.validity === 'INVALID_ISSUER' && 'bg-status-invalid-issuer'
        )}
        aria-hidden="true"
      />
    </motion.article>
  );
};
