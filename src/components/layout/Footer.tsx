import React from 'react';
import { ExternalLink, GitGraph } from 'lucide-react';
import { TRUST_GRAPH_REGISTRY_ADDRESS, getExplorerAddressUrl } from '../../lib/contract/config';
import { shortenAddress } from '../../utils/formatters';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-surface-border bg-surface-subtle text-ink-muted py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-surface-border">
          {/* Col 1: Core Concept */}
          <div>
            <div className="flex items-center gap-2 text-ink font-semibold text-sm mb-2">
              <GitGraph className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>TrustGraph</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed mb-3">
              An evidence-backed attestation and verification system on Monad.
              Inspect what someone claims, what evidence backs it, who reviewed it, and whether that verification still stands.
            </p>
            <div className="text-[11px] font-mono text-primary-bright/90 font-medium">
              &quot;Trust the evidence, not the profile.&quot;
            </div>
          </div>

          {/* Col 2: Registry Contract Details */}
          <div>
            <div className="font-mono text-[10px] text-ink-dim uppercase tracking-widest-xl mb-2">
              On-Chain Registry (Monad)
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-ink-dim">Contract</span>
                <span className="font-mono text-ink-muted">TrustGraphRegistry.sol</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-dim">Chain ID</span>
                <span className="font-mono text-ink-muted">10143 (Monad Testnet)</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-dim">Registry Address</span>
                <a
                  href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-ink-muted hover:text-evidence flex items-center gap-1 group transition-colors"
                >
                  <span>{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 5)}</span>
                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Architectural Distinction */}
          <div>
            <div className="font-mono text-[10px] text-ink-dim uppercase tracking-widest-xl mb-2">
              Product Model
            </div>
            <div className="text-[11px] font-mono text-ink-muted bg-surface border border-surface-border p-2.5 leading-relaxed corner-ticks">
              CLAIM → EVIDENCE → ISSUER → ATTESTATION → CURRENT VALIDITY
            </div>
            <p className="text-[11px] text-ink-dim leading-normal mt-2">
              An attestation proves an authorized reviewer validated the evidence. It does not replace independent scrutiny of the underlying proof.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-dim font-mono">
          <div>TrustGraph • Evidence & Attestation System on Monad</div>
          <div className="flex items-center gap-4 text-ink-dim">
            <span>React • TypeScript • Tailwind • Wagmi • Viem • Solidity</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
