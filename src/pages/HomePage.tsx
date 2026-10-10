import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Search, 
  GitGraph, 
  ShieldCheck, 
  Share2, 
  PlusCircle, 
  CheckCircle2, 
  ExternalLink,
  Lock,
  Layers,
  Info
} from 'lucide-react';
import { MOCK_ATTESTATIONS } from '../data/mockData';
import { DEMO_WALLETS, getExplorerTxUrl } from '../lib/contract/config';
import { shortenAddress, formatDate, getClaimTypeDetails, getValidityDetails } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim();
    if (/^\d+$/.test(clean)) {
      navigate(`/verify/${clean}`);
    } else if (clean.toLowerCase() === 'sarah' || clean.toLowerCase() === 'developer') {
      navigate(`/profile/${DEMO_WALLETS.DEVELOPER.address}`);
    } else if (clean.toLowerCase() === 'alex' || clean.toLowerCase() === 'organizer') {
      navigate(`/profile/${DEMO_WALLETS.ORGANIZER.address}`);
    } else {
      navigate(`/profile/${clean}`);
    }
  };

  const recentAttestations = MOCK_ATTESTATIONS.slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-16">
      
      {/* Hero Section */}
      <div className="max-w-4xl mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-mono mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          <span>TrustGraph • Monad Verification Registry</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
          Trust the evidence, <br />
          <span className="text-neutral-400">not the profile.</span>
        </h1>

        <p className="text-lg sm:text-xl text-neutral-300 font-medium leading-relaxed mb-4">
          &quot;Don&apos;t tell people what you can do. Show them what you&apos;ve actually done.&quot;
        </p>

        <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-8 max-w-2xl font-normal">
          TrustGraph is not a generic reputation score, NFT badge, or social feed. 
          It allows anyone to inspect what a person claims, what evidence backs it, who verified it, 
          whether that issuer was authorized, and whether the attestation still stands on Monad.
        </p>

        {/* Quick Search */}
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search wallet (0x...) or Claim #1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all font-mono"
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-sm rounded-lg transition-all shadow-sm active:scale-95"
          >
            Inspect
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-100 hover:bg-white text-neutral-950 font-medium text-xs sm:text-sm rounded-lg transition-all shadow-sm group"
          >
            <span>Inspect Sarah&apos;s Trust Profile</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            to={`/graph/${DEMO_WALLETS.DEVELOPER.address}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs sm:text-sm font-medium rounded-lg transition-all"
          >
            <Share2 className="h-3.5 w-3.5 text-neutral-400" />
            <span>Interactive Trust Graph</span>
          </Link>

          <Link
            to="/issue"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs sm:text-sm font-medium rounded-lg transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5 text-neutral-400" />
            <span>Issuer Portal</span>
          </Link>
        </div>
      </div>

      {/* Critical Principle Notice */}
      <div className="mb-14 p-5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-300 leading-relaxed">
          <strong className="text-white font-medium">The Core Distinction:</strong> An attestation proves that an authorized issuer reviewed the evidence and that the attestation is currently valid on Monad. It does <span className="underline decoration-neutral-500">not</span> automatically prove that the underlying claim is true. TrustGraph empowers you to inspect both the underlying evidence and the issuer&apos;s authority directly.
        </div>
      </div>

      {/* The 5-Step Product Model */}
      <div className="mb-14 p-6 sm:p-8 rounded-xl bg-neutral-900/40 border border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            TrustGraph Lifecycle
          </div>
          <div className="text-xs text-neutral-500 font-mono">
            &quot;Why should I trust this claim about this person?&quot;
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="text-xs font-mono text-neutral-500 mb-1">01. CLAIM</div>
            <div className="text-sm font-semibold text-white">What was done?</div>
            <div className="text-xs text-neutral-400 mt-1">CONTRACT_DEPLOYED, CHALLENGE_COMPLETED, CONTRIBUTION_VERIFIED</div>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="text-xs font-mono text-neutral-500 mb-1">02. EVIDENCE</div>
            <div className="text-sm font-semibold text-white">Supporting Proof</div>
            <div className="text-xs text-neutral-400 mt-1">Off-chain repo, deployment, testnet tx anchored by SHA-256</div>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="text-xs font-mono text-neutral-500 mb-1">03. ISSUER</div>
            <div className="text-sm font-semibold text-white">Who reviewed it?</div>
            <div className="text-xs text-neutral-400 mt-1">Authorized reviewer or jury verified in registry</div>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="text-xs font-mono text-neutral-500 mb-1">04. ATTESTATION</div>
            <div className="text-sm font-semibold text-white">On-Chain Record</div>
            <div className="text-xs text-neutral-400 mt-1">Immutable Monad testnet transaction with expiry and hash</div>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800/80">
            <div className="text-xs font-mono text-neutral-500 mb-1">05. VALIDITY</div>
            <div className="text-sm font-semibold text-white">Current Standing</div>
            <div className="text-xs text-neutral-400 mt-1">VALID, REVOKED, EXPIRED, or INVALID ISSUER</div>
          </div>
        </div>
      </div>

      {/* Guided Demo Flow */}
      <div className="mb-14">
        <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-4">
          Interactive Evaluation Walkthrough
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">1. Inspect Developer Profile</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Open Sarah&apos;s wallet profile. See verified smart contracts, challenge badges, and an intentionally revoked sample attestation preserved in historical records.
              </p>
            </div>
            <Link
              to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1.5"
            >
              <span>Open Sarah&apos;s Profile</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <GitGraph className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">2. Explore the Trust Graph</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Interactive connected graph visualizing the complete chain from Developer &rarr; Claims &rarr; Issuers &rarr; Evidence hashes.
              </p>
            </div>
            <Link
              to={`/graph/${DEMO_WALLETS.DEVELOPER.address}`}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5"
            >
              <span>Launch Graph View</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <PlusCircle className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">3. Issue New Attestation</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Step into the reviewer portal. Fill in evidence URL, calculate SHA-256 hash in real time, and record the attestation on Monad.
              </p>
            </div>
            <Link
              to="/issue"
              className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1.5"
            >
              <span>Open Issuer Form</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Attestations Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
            Recent On-Chain Attestations
          </div>
          <Link
            to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
            className="text-xs text-neutral-400 hover:text-white font-mono flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recentAttestations.map((att) => {
            const claimType = getClaimTypeDetails(att.claimType);
            const validity = getValidityDetails(att.validity);

            return (
              <div
                key={att.id}
                className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${claimType.tagBg}`}>
                      {claimType.label}
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${validity.badgeClass}`}>
                      {validity.label}
                    </span>
                  </div>

                  <h4 className="text-sm font-semibold text-white mb-1.5 leading-snug">
                    {att.claimTitle}
                  </h4>
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mb-4">
                    {att.claimDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-500 font-mono">
                  <div>
                    Subject: <span className="text-neutral-300">{shortenAddress(att.subject)}</span>
                  </div>
                  <Link
                    to={`/verify/${att.id}`}
                    className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
