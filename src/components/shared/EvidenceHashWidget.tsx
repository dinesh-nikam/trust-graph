import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Fingerprint, Copy, Check, ShieldCheck } from 'lucide-react';
import { ValidityStatus } from '../../types';
import { SectionHeader } from '../ui/Panel';
import { settleTransition } from '../../lib/motion';

interface EvidenceHashWidgetProps {
  hash: string;
  status: ValidityStatus;
}

export const EvidenceHashWidget: React.FC<EvidenceHashWidgetProps> = ({ hash, status }) => {
  const [copied, setCopied] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isValid = status === 'VALID';

  const copyHash = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Clipboard write failed', e);
    }
  };

  return (
    <div className="w-full bg-surface-subtle border border-surface-border corner-ticks p-4 flex flex-col gap-3">
      <SectionHeader
        title="Evidence Hash"
        index="⌗"
        className="border-b-0 pb-0"
        right={
          isValid ? (
            <motion.span
              initial={shouldReduceMotion ? false : { opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={settleTransition}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-emerald-400"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Content Integral
            </motion.span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-dim">
              Unverified
            </span>
          )
        }
      />

      <div className="flex items-start gap-3">
        <Fingerprint className="h-4 w-4 mt-1 text-evidence shrink-0" aria-hidden="true" />
        <code
          className="flex-1 font-mono text-xs sm:text-sm text-ink break-all leading-relaxed select-all cursor-text"
          title="Full evidence hash — select to copy"
        >
          {hash}
        </code>
        <button
          type="button"
          onClick={copyHash}
          aria-label={copied ? 'Hash copied' : 'Copy evidence hash'}
          className="shrink-0 p-2 border border-surface-border text-ink-dim hover:text-ink hover:border-surface-border-strong hover:bg-surface-hover transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
};
