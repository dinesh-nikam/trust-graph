import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Panel — the base surface of "The Trust Instrument".
 * Hairline border + corner registration ticks. Ticks brighten
 * to primary violet on hover when `interactive` is set.
 */
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  ticks?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, interactive = false, ticks = true, as = 'div', children, ...props }, ref) => {
    const Tag = as as React.ElementType;
    return (
      <Tag
        ref={ref}
        className={cn(
          'relative bg-surface border border-surface-border',
          ticks && 'corner-ticks',
          interactive &&
            'corner-ticks-accent transition-colors duration-200 hover:border-surface-border-strong hover:bg-surface-raised cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Panel.displayName = 'Panel';

/**
 * SectionHeader — indexed instrument label ("01 / EVIDENCE").
 */
interface SectionHeaderProps {
  index?: string | number;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ index, title, hint, right, className }) => (
  <div className={cn('flex items-center justify-between gap-4 border-b border-surface-border pb-3', className)}>
    <div className="flex items-baseline gap-3 min-w-0">
      {index !== undefined && (
        <span className="font-mono text-[10px] text-primary shrink-0 tracking-widest-xl">
          {String(index).padStart(2, '0')}
        </span>
      )}
      <h2 className="font-mono text-[11px] uppercase tracking-widest-xl text-ink-muted truncate">
        {title}
      </h2>
      {hint && <span className="hidden sm:inline font-mono text-[10px] text-ink-dim truncate">{hint}</span>}
    </div>
    {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
  </div>
);
