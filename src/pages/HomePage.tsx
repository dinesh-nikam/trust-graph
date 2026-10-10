import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  PlusCircle,
  Info,
  ArrowRight,
  FileCode2,
  FileCheck,
  UserCheck,
  Link2,
  ShieldCheck,
  Eye,
  Hash,
  Ban,
  Clock,
  CheckCircle2,
  Code2,
  Users,
} from 'lucide-react';
import { MONAD_TESTNET_CHAIN_ID } from '../lib/contract/config';
import { Reveal } from '../components/ui/Reveal';

const lifecycle = [
  {
    step: '01',
    label: 'CLAIM',
    title: 'What was done?',
    body: 'CONTRACT_DEPLOYED, CHALLENGE_COMPLETED, CONTRIBUTION_VERIFIED',
    icon: FileCode2,
  },
  {
    step: '02',
    label: 'EVIDENCE',
    title: 'Supporting Proof',
    body: 'Off-chain repo, deployment, testnet tx anchored by SHA-256',
    icon: FileCheck,
  },
  {
    step: '03',
    label: 'ISSUER',
    title: 'Who reviewed it?',
    body: 'Authorized reviewer or jury verified in registry',
    icon: UserCheck,
  },
  {
    step: '04',
    label: 'ATTESTATION',
    title: 'On-Chain Record',
    body: 'Immutable Monad testnet transaction with expiry and hash',
    icon: Link2,
  },
  {
    step: '05',
    label: 'VALIDITY',
    title: 'Current Standing',
    body: 'VALID, REVOKED, EXPIRED, or INVALID ISSUER',
    icon: ShieldCheck,
  },
];

const questions = [
  { q: 'What did this person do?', a: 'Claim title, type and the reviewer’s description of scope.' },
  { q: 'What evidence supports it?', a: 'A public evidence URL and the SHA-256 digest anchored on-chain.' },
  { q: 'Who verified it?', a: 'The issuer address and whether the registry still authorizes it.' },
  { q: 'When was it issued?', a: 'Issue timestamp and expiry, read from the registry record.' },
  { q: 'Is it still valid?', a: 'Validity is derived from revocation, expiry and issuer standing.' },
  { q: 'Can I check it without this UI?', a: 'Take the contract address and attestation ID to Monad Explorer.' },
];

const actors = [
  {
    icon: Code2,
    title: 'Developer',
    body: 'Ships work and publishes an evidence manifest. Cannot approve or revoke their own claims.',
  },
  {
    icon: UserCheck,
    title: 'Authorized Issuer',
    body: 'Reviews evidence, records attestations on Monad, and revokes them with a stated reason.',
  },
  {
    icon: Eye,
    title: 'Public Viewer',
    body: 'Audits any profile or attestation. No wallet, no gas, no account required.',
  },
];

const anatomyRows = [
  { icon: FileCode2, label: 'Claim', width: 'w-40' },
  { icon: Hash, label: 'Evidence hash', width: 'w-48' },
  { icon: UserCheck, label: 'Issuer', width: 'w-32' },
  { icon: Link2, label: 'Attestation', width: 'w-44' },
  { icon: ShieldCheck, label: 'Validity', width: 'w-24' },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20">

      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center mb-24">
        <div className="lg:col-span-7 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs text-neutral-300 font-mono mb-7">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(41,233,191,0.8)]" aria-hidden="true"></span>
            <span>TrustGraph • Monad Verification Registry</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.035em] text-white mb-6 leading-[1.02]">
            Trust the evidence, <br />
            <span className="text-gradient-accent">not the profile.</span>
          </h1>

          <p className="text-lg sm:text-xl text-neutral-200 font-medium leading-relaxed mb-4 max-w-2xl">
            &quot;Don&apos;t tell people what you can do. Show them what you&apos;ve actually done.&quot;
          </p>

          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-9 max-w-2xl">
            TrustGraph is not a generic reputation score, NFT badge, or social feed.
            It allows anyone to inspect what a person claims, what evidence backs it, who verified it,
            whether that issuer was authorized, and whether the attestation still stands on Monad.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl mb-6">
            <div className="relative flex-1">
              <label htmlFor="hero-search" className="sr-only">Search wallet address or claim ID</label>
              <input
                id="hero-search"
                type="text"
                placeholder="Search wallet (0x...) or Claim #1"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-12 bg-neutral-900/70 border border-neutral-700/80 rounded-xl pl-11 pr-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-400/20 transition-all font-mono backdrop-blur"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
            </div>
            <button type="submit" className="btn-primary h-12 px-6 text-sm">
              <span>Inspect</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 mb-10">
            <Link to="/issue" className="btn-secondary px-4 py-2.5 text-xs sm:text-sm">
              <PlusCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Issuer Portal</span>
            </Link>
            <Link to="/verify" className="btn-secondary px-4 py-2.5 text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              <span>Verifier Queue</span>
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-neutral-400">
            {[
              { icon: Eye, text: 'No wallet needed to audit' },
              { icon: Hash, text: 'SHA-256 evidence anchors' },
              { icon: Ban, text: 'Revocations stay on record' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hero visual: schema illustration, not a live record */}
        <div className="lg:col-span-5 relative" aria-hidden="true">
          <div className="absolute -inset-10 bg-[radial-gradient(closest-side,rgba(41,233,191,0.16),transparent)] blur-2xl pointer-events-none" />
          <div className="relative animate-float">
            <div className="glass-panel rounded-[28px] p-6 shadow-float">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono text-neutral-300 tracking-wide">PROOF ANATOMY</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-neutral-700 text-neutral-400">
                  Illustrative · schema only
                </span>
              </div>

              <div className="space-y-2.5">
                {anatomyRows.map(({ icon: Icon, label, width }, i) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80"
                  >
                    <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-mono text-neutral-400 mb-1.5">
                        {String(i + 1).padStart(2, '0')} · {label}
                      </div>
                      <div className={`h-1.5 rounded-full bg-neutral-700/70 ${width} max-w-full`} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-5 border-t border-neutral-800/80">
                <div className="text-[10px] font-mono text-neutral-500 mb-3 tracking-wider">LIFECYCLE STATES</div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
                    <Clock className="h-3 w-3" /> PENDING
                  </span>
                  <ArrowRight className="h-3 w-3 text-neutral-600 shrink-0" />
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> VALID
                  </span>
                  <ArrowRight className="h-3 w-3 text-neutral-600 shrink-0" />
                  <span className="flex items-center gap-1 px-2 py-1 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400">
                    <Ban className="h-3 w-3" /> REVOKED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System facts */}
      <Reveal as="section" className="mb-24">
        <div className="glass-panel rounded-3xl grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-neutral-800/80">
          {[
            { value: '0', label: 'Numerical trust scores' },
            { value: '3', label: 'Claim categories' },
            { value: '3', label: 'Actors, one registry' },
            { value: String(MONAD_TESTNET_CHAIN_ID), label: 'Monad Testnet chain ID' },
          ].map((fact) => (
            <div key={fact.label} className="p-6 sm:p-8">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-50 font-mono">
                {fact.value}
              </div>
              <div className="text-xs text-neutral-400 mt-2">{fact.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Lifecycle */}
      <section className="mb-24">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="eyebrow mb-3">TrustGraph Lifecycle</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-xl">
              Five checkpoints between a claim and a proof.
            </h2>
          </div>
          <p className="text-sm text-neutral-400 font-mono max-w-sm">
            &quot;Why should I trust this claim about this person?&quot;
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {lifecycle.map(({ step, label, title, body, icon: Icon }, i) => (
            <Reveal key={step} delay={i * 70}>
              <div className="glass-panel card-lift rounded-2xl p-5 h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-10 w-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-mono text-neutral-600">{step}</span>
                </div>
                <div className="text-[11px] font-mono tracking-wider text-neutral-500 mb-1">{label}</div>
                <div className="text-base font-semibold text-white mb-2">{title}</div>
                <div className="text-xs text-neutral-400 leading-relaxed">{body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Core distinction */}
      <Reveal as="section" className="mb-24">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-emerald-950/60 via-neutral-950 to-neutral-950 p-6 sm:p-10">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" aria-hidden="true" />
          <div className="relative flex flex-col sm:flex-row items-start gap-5">
            <div className="h-11 w-11 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div className="max-w-3xl">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3">The Core Distinction</h2>
              <p className="text-sm text-neutral-300 leading-relaxed">
                An attestation proves that an authorized issuer reviewed the evidence and that the attestation is currently valid on Monad. It does <span className="underline decoration-neutral-500">not</span> automatically prove that the underlying claim is true. TrustGraph empowers you to inspect both the underlying evidence and the issuer&apos;s authority directly.
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Six questions */}
      <section className="mb-24">
        <Reveal className="mb-10">
          <div className="eyebrow mb-3">Audit Surface</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-2xl">
            Every attestation answers six questions.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {questions.map(({ q, a }, i) => (
            <Reveal key={q} delay={i * 60}>
              <div className="glass-panel card-lift rounded-2xl p-6 h-full">
                <div className="text-xs font-mono text-emerald-400 mb-3">Q{String(i + 1).padStart(2, '0')}</div>
                <div className="text-base font-semibold text-white mb-2">{q}</div>
                <div className="text-sm text-neutral-400 leading-relaxed">{a}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Actors */}
      <section className="mb-24">
        <Reveal className="mb-10">
          <div className="eyebrow mb-3">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Who Uses It
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-2xl">
            Three roles. Clear boundaries.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actors.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 80}>
              <div className="glass-panel card-lift rounded-2xl p-6 h-full">
                <div className="h-11 w-11 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center mb-5">
                  <Icon className="h-5 w-5 text-neutral-200" aria-hidden="true" />
                </div>
                <div className="text-lg font-semibold text-white mb-2">{title}</div>
                <div className="text-sm text-neutral-400 leading-relaxed">{body}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <Reveal as="section" className="mb-16">
        <div className="relative overflow-hidden glass-panel rounded-[32px] px-6 py-14 sm:px-12 sm:py-20 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(41,233,191,0.14),transparent_60%)] pointer-events-none" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
              Show what you&apos;ve <span className="text-gradient-accent">actually done.</span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto mb-8">
              Record evidence-backed attestations on Monad, or audit any wallet&apos;s record without connecting one.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/issue" className="btn-primary px-6 py-3 text-sm">
                <PlusCircle className="h-4 w-4" aria-hidden="true" />
                <span>Issue an Attestation</span>
              </Link>
              <Link to="/verify" className="btn-secondary px-6 py-3 text-sm">
                <span>Open Verifier Queue</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="p-5 rounded-2xl bg-neutral-900/50 border border-neutral-800">
        <p className="text-xs text-neutral-400">Public records are loaded from the configured Monad Testnet registry after you search for a wallet address or attestation ID. Network failures are shown as errors; no sample records are substituted.</p>
        <p className="text-xs text-neutral-500 mt-2">Configured chain ID: {MONAD_TESTNET_CHAIN_ID}</p>
      </div>

    </div>
  );
};
