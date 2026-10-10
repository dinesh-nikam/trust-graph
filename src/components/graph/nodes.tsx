import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion, useReducedMotion } from 'motion/react';
import { GitGraph, UserCheck, Fingerprint, ShieldX } from 'lucide-react';
import type { TrustNode } from './graphLayout';
import { getClaimTypeDetails, getValidityDetails } from '../../utils/formatters';
import { settleTransition } from '../../lib/motion';
import { cn } from '../../utils/cn';

const VALIDITY_STRIP: Record<string, string> = {
  VALID: 'bg-status-verified',
  REVOKED: 'bg-status-revoked',
  EXPIRED: 'bg-status-expired',
  INVALID_ISSUER: 'bg-status-invalid-issuer',
};

function useNodeEntrance(delay: number) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  return {
    initial: shouldReduceMotion ? false : { opacity: 0, scale: 0.9, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    transition: { ...settleTransition, delay: shouldReduceMotion ? 0 : delay },
  };
}

const InvisibleHandle = ({ type, id, position, top }: {
  type: 'source' | 'target';
  id?: string;
  position: Position;
  top?: string;
}) => (
  <Handle
    type={type}
    id={id}
    position={position}
    style={top ? { top, opacity: 0, pointerEvents: 'none' } : { opacity: 0, pointerEvents: 'none' }}
    isConnectable={false}
  />
);

const KindLabel: React.FC<{ kind: string; className?: string }> = ({ kind, className }) => (
  <span className={cn('font-mono text-[9px] uppercase tracking-widest-xl text-ink-dim', className)}>
    {kind}
  </span>
);

const SubjectNode: React.FC<NodeProps<TrustNode>> = ({ data, selected }) => {
  const entrance = useNodeEntrance(data.entranceDelay);
  return (
    <motion.div
      {...entrance}
      className={cn(
        'corner-ticks w-60 bg-surface-raised border transition-colors duration-300 px-4 py-3.5',
        selected ? 'border-primary shadow-glow-primary' : 'border-surface-border-strong'
      )}
    >
      <InvisibleHandle type="source" id="r" position={Position.Right} top="50%" />
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <GitGraph className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <KindLabel kind="Subject" />
        </div>
        <span className="font-mono text-[10px] text-ink-dim" data-testid="subject-claim-count">
          {data.claimCount} {data.claimCount === 1 ? 'claim' : 'claims'}
        </span>
      </div>
      <div className="text-sm font-semibold text-ink leading-snug">{data.label}</div>
      <div className="font-mono text-[11px] text-ink-dim mt-0.5">{data.subtitle}</div>
    </motion.div>
  );
};

const ClaimNode: React.FC<NodeProps<TrustNode>> = ({ data, selected }) => {
  const entrance = useNodeEntrance(data.entranceDelay);
  const claimType = getClaimTypeDetails(data.claimTypeLabel ?? 'CONTRIBUTION_VERIFIED');
  const validity = getValidityDetails(data.validity ?? 'PENDING');
  return (
    <motion.div
      {...entrance}
      className={cn(
        'w-72 bg-surface-raised border transition-colors duration-300 relative',
        selected ? 'border-primary shadow-glow-primary' : 'border-surface-border hover:border-surface-border-strong'
      )}
    >
      <InvisibleHandle type="target" id="l" position={Position.Left} top="50%" />
      <InvisibleHandle type="source" id="r2" position={Position.Right} top="30%" />
      <InvisibleHandle type="source" id="r3" position={Position.Right} top="74%" />
      <div className={cn('absolute left-0 top-0 bottom-0 w-0.5', VALIDITY_STRIP[data.validity ?? 'PENDING'])} aria-hidden="true" />
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={cn('text-[9px] font-mono px-1.5 py-0.5 border uppercase tracking-widest', claimType.tagBg)}>
            {claimType.shortLabel}
          </span>
          <ValidityDot validity={data.validity} label={validity.label} symbol={validity.symbol} />
        </div>
        <div className="text-[13px] font-medium text-ink leading-snug line-clamp-2">{data.label}</div>
        <div className="font-mono text-[10px] text-ink-dim mt-1.5 flex items-center gap-2 min-w-0">
          <span className="truncate">{data.subtitle}</span>
          {data.isFixture && (
            <span className="shrink-0 text-[8px] uppercase tracking-widest px-1 py-px border border-status-pending/40 text-status-pending bg-status-pending/[0.07]">
              Fixture
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const ValidityDot: React.FC<{ validity?: string; label: string; symbol: string }> = ({ validity, label, symbol }) => (
  <span
    className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest text-ink-muted"
    role="status"
    aria-label={`Validity: ${label}`}
  >
    <span aria-hidden="true" className={cn('inline-block h-1.5 w-1.5 rounded-full', VALIDITY_STRIP[validity ?? 'PENDING'])} />
    {symbol} {label}
  </span>
);

const IssuerNode: React.FC<NodeProps<TrustNode>> = ({ data, selected }) => {
  const entrance = useNodeEntrance(data.entranceDelay);
  const authorized = data.authorized ?? false;
  return (
    <motion.div
      {...entrance}
      className={cn(
        'w-60 bg-surface border transition-colors duration-300 px-3 py-2.5',
        selected ? 'border-primary' : 'border-surface-border hover:border-surface-border-strong'
      )}
    >
      <InvisibleHandle type="target" id="l" position={Position.Left} top="50%" />
      <div className="flex items-center gap-2">
        <UserCheck
          className={cn('h-3.5 w-3.5 shrink-0', authorized ? 'text-status-verified' : 'text-status-invalid-issuer')}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-ink truncate leading-tight">{data.label}</div>
          <div className="font-mono text-[10px] text-ink-dim leading-tight mt-0.5">{data.subtitle}</div>
        </div>
        <span
          className={cn(
            'font-mono text-[9px] tracking-widest shrink-0 inline-flex items-center gap-0.5',
            authorized ? 'text-status-verified' : 'text-status-invalid-issuer'
          )}
          aria-label={authorized ? 'Issuer authorized' : 'Issuer not authorized'}
        >
          {authorized ? '✓ AUTH' : <><ShieldX className="h-2.5 w-2.5" aria-hidden="true" /> REVOKED</>}
        </span>
      </div>
    </motion.div>
  );
};

const EvidenceNode: React.FC<NodeProps<TrustNode>> = ({ data, selected }) => {
  const entrance = useNodeEntrance(data.entranceDelay);
  return (
    <motion.div
      {...entrance}
      className={cn(
        'w-60 bg-surface border transition-colors duration-300 px-3 py-2.5',
        selected ? 'border-evidence shadow-glow-evidence' : 'border-surface-border hover:border-surface-border-strong'
      )}
    >
      <InvisibleHandle type="target" id="l" position={Position.Left} top="50%" />
      <div className="flex items-center gap-2">
        <Fingerprint className="h-3.5 w-3.5 text-evidence shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[11px] text-ink-muted truncate leading-tight">{data.label}</div>
          <div className="font-mono text-[9px] text-ink-dim uppercase tracking-widest leading-tight mt-0.5">{data.subtitle}</div>
        </div>
        <span className="font-mono text-[9px] text-evidence/70 tracking-widest shrink-0">SHA-256</span>
      </div>
    </motion.div>
  );
};

export const nodeTypes = {
  subject: memo(SubjectNode),
  claim: memo(ClaimNode),
  issuer: memo(IssuerNode),
  evidence: memo(EvidenceNode),
};
