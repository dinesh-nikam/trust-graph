import React from 'react';
import { ExternalLink, GitGraph } from 'lucide-react';
import { TRUST_GRAPH_REGISTRY_ADDRESS, getExplorerAddressUrl } from '../../lib/contract/config';
import { shortenAddress } from '../../utils/formatters';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-neutral-800/80 bg-neutral-950 text-neutral-400 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-neutral-900">
          {/* Col 1: Core Concept */}
          <div>
            <div className="flex items-center gap-2 text-white font-semibold text-sm mb-2">
              <GitGraph className="h-4 w-4 text-emerald-400" />
              <span>TrustGraph</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed mb-3">
              An evidence-backed attestation and verification system on Monad.
              Inspect what someone claims, what evidence backs it, who reviewed it, and whether that verification still stands.
            </p>
            <div className="text-[11px] font-mono text-emerald-400/90 font-medium">
              &quot;Trust the evidence, not the profile.&quot;
            </div>
          </div>

          {/* Col 2: Registry Contract Details */}
          <div>
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              On-Chain Registry (Monad)
            </div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-neutral-500">Contract</span>
                <span className="font-mono text-neutral-300">TrustGraphRegistry.sol</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-500">Chain ID</span>
                <span className="font-mono text-neutral-300">10143 (Monad Testnet)</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-neutral-500">Registry Address</span>
                <a
                  href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-neutral-300 hover:text-white flex items-center gap-1 group"
                >
                  <span>{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 5)}</span>
                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Architectural Distinction */}
          <div>
            <div className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Product Model
            </div>
            <div className="text-[11px] font-mono text-neutral-300 bg-neutral-900/60 p-2.5 rounded border border-neutral-800 mb-2 leading-relaxed">
              CLAIM → EVIDENCE → ISSUER → ATTESTATION → CURRENT VALIDITY
            </div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              An attestation proves an authorized reviewer validated the evidence. It does not replace independent scrutiny of the underlying proof.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 font-mono">
          <div>TrustGraph • Evidence & Attestation System on Monad</div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>React • TypeScript • Tailwind • Wagmi • Viem • Solidity</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
