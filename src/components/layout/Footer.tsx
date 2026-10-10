import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { TRUST_GRAPH_REGISTRY_ADDRESS, getExplorerAddressUrl } from '../../lib/contract/config';
import { shortenAddress } from '../../utils/formatters';
import { BrandMark } from '../ui/BrandMark';

const productLinks = [
  { label: 'Overview', to: '/' },
  { label: 'Submit Work', to: '/submit' },
  { label: 'Verifier Queue', to: '/verify' },
  { label: 'Issue Attestation', to: '/issue' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="relative mt-auto border-t border-white/[0.06] bg-neutral-950/60">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5 mb-4">
              <BrandMark className="h-8 w-8" />
              <span className="font-bold text-[15px] tracking-tight text-neutral-50">TrustGraph</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-sm mb-5">
              An evidence-backed attestation and verification system on Monad.
              Inspect what someone claims, what evidence backs it, who reviewed it, and whether that verification still stands.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-300">
              <span className="h-px w-6 bg-emerald-400/60" aria-hidden="true" />
              &quot;Trust the evidence, not the profile.&quot;
            </div>
          </div>

          <div className="md:col-span-2">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500 mb-4">Product</h2>
            <ul className="space-y-2.5 text-sm">
              {productLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-neutral-300 hover:text-emerald-300 transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-5">
            <h2 className="text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500 mb-4">On-Chain Registry (Monad)</h2>
            <dl className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-white/[0.05]">
                <dt className="text-neutral-500">Contract</dt>
                <dd className="font-mono text-neutral-200">TrustGraphRegistry.sol</dd>
              </div>
              <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-white/[0.05]">
                <dt className="text-neutral-500">Chain ID</dt>
                <dd className="font-mono text-neutral-200">10143 (Monad Testnet)</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-neutral-500">Registry Address</dt>
                <dd>
                  <a
                    href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-neutral-200 hover:text-emerald-300 inline-flex items-center gap-1 group"
                  >
                    <span>{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 5)}</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            </dl>
            <div className="mt-5 text-[11px] font-mono text-neutral-300 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 leading-relaxed">
              CLAIM → EVIDENCE → ISSUER → ATTESTATION → CURRENT VALIDITY
            </div>
            <p className="mt-3 text-[11px] text-neutral-500 leading-relaxed">
              An attestation proves an authorized reviewer validated the evidence. It does not replace independent scrutiny of the underlying proof.
            </p>
          </div>
        </div>

        <div className="hairline" />
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500 font-mono">
          <div>TrustGraph · Evidence &amp; Attestation System on Monad</div>
          <div>React · TypeScript · Tailwind · Wagmi · Viem · Solidity</div>
        </div>
      </div>
    </footer>
  );
};
