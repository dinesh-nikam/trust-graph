import React from 'react';
import { Check, X, Clock, ShieldX } from 'lucide-react';
import { ValidityStatus } from '../../types';
import { cn } from '../../utils/cn';

interface ValidityBadgeProps {
  status: ValidityStatus;
  className?: string;
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<
  ValidityStatus,
  { label: string; icon: React.ElementType; styles: string; iconClass: string }
> = {
  VALID: {
    label: 'VALID',
    icon: Check,
    styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    iconClass: 'text-emerald-400',
  },
  REVOKED: {
    label: 'REVOKED',
    icon: X,
    styles: 'bg-status-revoked/10 text-status-revoked border-status-revoked/30',
    iconClass: 'text-status-revoked',
  },
  EXPIRED: {
    label: 'EXPIRED',
    icon: Clock,
    styles: 'bg-status-expired/10 text-status-expired border-status-expired/30',
    iconClass: 'text-status-expired',
  },
  INVALID_ISSUER: {
    // Ghost state: dashed border — visually distinct from every solid verdict
    label: 'INVALID ISSUER',
    icon: ShieldX,
    styles: 'bg-transparent text-ink-muted border-dashed border-surface-border-strong',
    iconClass: 'text-ink-muted',
  },
};

export const ValidityBadge: React.FC<ValidityBadgeProps> = ({ status, className, showIcon = true }) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 border font-mono text-[10px] font-bold uppercase tracking-widest whitespace-nowrap',
        config.styles,
        className
      )}
      role="status"
      aria-label={`Validity: ${config.label}`}
    >
      {showIcon && <Icon className={cn('h-3 w-3', config.iconClass)} strokeWidth={2.5} aria-hidden="true" />}
      {config.label}
    </span>
  );
};
