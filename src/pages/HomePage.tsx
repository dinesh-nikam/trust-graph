import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Search,
  ShieldCheck,
  UserCheck,
  PlusCircle,
  ExternalLink,
  Fingerprint,
  ChevronRight,
  Eye,
  Share2,
} from 'lucide-react';
import { MOCK_ATTESTATIONS } from '../data/mockData';
import { DEMO_WALLETS, TRUST_GRAPH_REGISTRY_ADDRESS } from '../lib/contract/config';
import { getExplorerAddressUrl } from '../lib/blockchain/chain';
import { shortenAddress } from '../utils/formatters';
import { AttestationCard } from '../components/shared/AttestationCard';
import { SectionHeader } from '../components/ui/Panel';
import { HeroNetwork } from '../components/three/HeroNetwork';
import { useAllAttestations } from '../hooks/useTrustGraph';
import { trustGraphService } from '../services/trustGraphService';
import { fadeRise, staggerParent } from '../lib/motion';
import { cn } from '../utils/cn';

const PIPELINE_STEPS = [
  { step: '01', title: 'Claim', desc: 'What was built or accomplished', numClass: 'text-ink-faint' },
  { step: '02', title: 'Evidence', desc: 'Repos, contracts, deployments, URLs', numClass: 'text-ink-faint' },
  { step: '03', title: 'Issuer', desc: 'Registry-authorized reviewer', numClass: 'text-ink-faint' },
  { step: '04', title: 'Attestation', desc: 'Immutable Monad on-chain record', numClass: 'text-primary' },
  { step: '05', title: 'Validity', desc: 'VALID · REVOKED · EXPIRED', numClass: 'text-status-verified' },
] as const;

const EVAL_CARDS = [
  {
    num: '01',
    title: 'Inspect a Developer Profile',
    desc: "Open a wallet's trust profile. See verified contracts, challenge completions, and historical revocations.",
    link: `/profile/${DEMO_WALLETS.DEVELOPER.address}`,
    linkText: "Open Sarah's Profile",
    icon: Eye,
    accent: {
      num: 'text-status-verified',
      link: 'text-status-verified hover:text-emerald-300',
      icon: 'text-status-verified',
    },
  },
  {
    num: '02',
    title: 'Explore the Trust Graph',
    desc: 'Interactive tree connecting Subject → Claims → Issuers → Evidence hashes in a single explorable view.',
    link: `/graph/${DEMO_WALLETS.DEVELOPER.address}`,
    linkText: 'Launch Graph',
    icon: Share2,
    accent: {
      num: 'text-primary',
      link: 'text-primary hover:text-primary-bright',
      icon: 'text-primary',
    },
  },
  {
    num: '03',
    title: 'Issue an Attestation',
    desc: 'Step into the reviewer portal. Fill in evidence, compute SHA-256 in real time, and anchor on Monad.',
    link: '/issue',
    linkText: 'Open Issuer Portal',
    icon: PlusCircle,
    accent: {
      num: 'text-status-pending',
      link: 'text-status-pending hover:text-amber-300',
      icon: 'text-status-pending',
    },
  },
] as const;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const shouldReduceMotion = useReducedMotion() ?? false;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim();
    if (/^\d+$/.test(clean)) {
      navigate(`/verify/${clean}`);
    } else {
      navigate(`/profile/${clean}`);
    }
  };

  const { data: allAttestations = [] } = useAllAttestations();
  const isDemo = trustGraphService.getMode() === 'DEMO';
  const recentAttestations = allAttestations.length > 0 
    ? allAttestations.slice(0, 3) 
    : isDemo 
      ? MOCK_ATTESTATIONS.slice(0, 3) 
      : [];
  const enter = shouldReduceMotion ? false : 'hidden';

  return (
    <div>
      {/* ─── Hero: cinematic trust network ─────────────────── */}
      <section className="relative overflow-hidden border-b border-surface-border">
        <HeroNetwork className="absolute inset-0 pointer-events-none" />

        {/* Readability vignettes over the scene */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(90deg,#09090F_0%,rgba(9,9,15,0.94)_34%,rgba(9,9,15,0.55)_62%,rgba(9,9,15,0.12)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-44 pointer-events-none bg-gradient-to-t from-background to-transparent" />

        <motion.div
          variants={staggerParent(0.09, 0.1)}
          initial={enter}
          animate="visible"
          className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-24 sm:pb-32 min-h-[620px] flex flex-col justify-center"
        >
          <motion.div variants={fadeRise} className="mb-8">
            <span className="inline-flex items-center gap-2.5 corner-ticks px-3 py-1.5 bg-surface-subtle/80">
              <span className="h-1.5 w-1.5 rounded-full bg-status-verified animate-pulse" aria-hidden="true" />
              <span className="font-mono text-[11px] text-ink-muted uppercase tracking-widest-xl">
                Monad Testnet · Chain 10143
              </span>
            </span>
          </motion.div>

          <motion.h1
            variants={fadeRise}
            className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.04] mb-6 max-w-3xl"
          >
            <span className="text-ink">Trust the evidence,</span>{' '}
            <span className="text-ink-dim">not the profile.</span>
          </motion.h1>

          <motion.p
            variants={fadeRise}
            className="text-base sm:text-lg text-ink-muted leading-relaxed mb-10 max-w-xl"
          >
            TrustGraph is an on-chain verification registry. Inspect what was claimed,
            what evidence supports it, who reviewed it, and whether the attestation
            currently stands on Monad.
          </motion.p>

          <motion.div variants={fadeRise}>
            <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mb-4" role="search">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder='0x address, claim #, or "sarah"'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search by address or claim number"
                  className="w-full bg-surface-subtle/90 border border-surface-border py-3 pl-10 pr-4 text-sm text-ink placeholder-ink-dim focus:outline-none focus:border-primary/60 transition-colors font-mono"
                />
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-dim" aria-hidden="true" />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-primary-bright text-white font-semibold text-sm transition-colors active:scale-[0.98]"
              >
                Inspect
              </button>
            </form>
          </motion.div>

          <motion.div variants={fadeRise} className="flex flex-wrap items-center gap-3 mb-14">
            <Link
              to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-bright text-white text-sm font-medium transition-colors active:scale-[0.98]"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              <span>Explore a Passport</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </Link>
            <Link
              to="/verify/1"
              className="group inline-flex items-center gap-2 px-5 py-2.5 bg-surface/90 border border-surface-border-strong hover:border-primary/50 text-ink text-sm font-medium transition-colors"
            >
              <ShieldCheck className="h-4 w-4 text-evidence" aria-hidden="true" />
              <span>Verify a Claim</span>
            </Link>
            <Link
              to="/issue"
              className="group inline-flex items-center gap-1.5 px-2 py-2.5 text-ink-muted hover:text-ink text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-status-pending" aria-hidden="true" />
              <span>Issue Attestation</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" aria-hidden="true" />
            </Link>
          </motion.div>

          <motion.div
            variants={fadeRise}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-widest-xl text-ink-dim"
          >
            <a
              href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink-muted transition-colors inline-flex items-center gap-1.5"
            >
              <span>Registry {shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 4)}</span>
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
            </a>
            <span className="hidden sm:inline text-ink-faint">·</span>
            <span>SHA-256 Evidence Anchors</span>
            <span className="hidden sm:inline text-ink-faint">·</span>
            <span>Authorized Issuer Signatures</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Verification Pipeline ─────────────────────────── */}
      <section className="border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <SectionHeader
            index="01"
            title="Verification Pipeline"
            hint="Claim → Attestation → Current validity"
          />

          <motion.div
            variants={staggerParent(0.07)}
            initial={enter}
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-5 gap-3"
          >
            {PIPELINE_STEPS.map((item) => (
              <motion.div
                key={item.step}
                variants={fadeRise}
                className="corner-ticks p-5 bg-surface flex flex-col gap-2"
              >
                <span className={cn('font-mono text-[10px] tracking-widest-xl', item.numClass)}>
                  {item.step}
                </span>
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="text-xs text-ink-dim leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={fadeRise}
            initial={enter}
            animate="visible"
            className="mt-6 flex items-start gap-3 p-4 border border-surface-border bg-surface-subtle"
          >
            <Fingerprint className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-xs text-ink-muted leading-relaxed">
              <strong className="text-ink">Core distinction:</strong> An attestation proves an
              authorized issuer reviewed evidence and recorded it on Monad. It does not
              automatically prove the underlying claim is true. TrustGraph lets you inspect both.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Guided Evaluation ─────────────────────────────── */}
      <section className="border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <SectionHeader index="02" title="Guided Evaluation" hint="Three surfaces, one evidence trail" />

          <motion.div
            variants={staggerParent(0.08)}
            initial={enter}
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {EVAL_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.num}
                  variants={fadeRise}
                  className="corner-ticks corner-ticks-accent p-6 bg-surface border border-surface-border hover:border-surface-border-strong hover:bg-surface-raised transition-colors flex flex-col justify-between gap-6"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn('font-mono text-[10px] tracking-widest-xl', card.accent.num)}>
                        {card.num}
                      </span>
                      <Icon className={cn('h-4 w-4', card.accent.icon)} aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-semibold text-ink mb-2 leading-snug">{card.title}</h3>
                    <p className="text-xs text-ink-dim leading-relaxed">{card.desc}</p>
                  </div>
                  <Link
                    to={card.link}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest transition-colors',
                      card.accent.link
                    )}
                  >
                    <span>{card.linkText}</span>
                    <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── Recent Attestations ───────────────────────────── */}
      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <SectionHeader
            index="03"
            title="Recent Attestations"
            hint={
              allAttestations.length > 0
                ? "Live on-chain records from Monad Testnet (10143)"
                : isDemo
                ? "Local fixture records [DEMO MODE]"
                : "Awaiting on-chain attestations on Monad Testnet"
            }
            right={
              <Link
                to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
                className="text-xs font-mono text-ink-dim hover:text-ink flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentAttestations.map((att, i) => (
              <AttestationCard key={att.id} attestation={att} index={i} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
