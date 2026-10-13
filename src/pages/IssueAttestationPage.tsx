import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Lock,
  RefreshCw,
  Fingerprint,
  Terminal,
  XCircle,
} from 'lucide-react';
import { useIssueAttestation, useIssuerStatus, type TxStep } from '../hooks/useTrustGraph';
import { ClaimType } from '../types';
import { computeSha256, shortenAddress } from '../utils/formatters';
import { DEMO_WALLETS, MONAD_TESTNET_CHAIN_ID } from '../lib/contract/config';
import { translateTxError } from '../lib/blockchain/errors';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { fadeRise, settleTransition, staggerParent } from '../lib/motion';
import { cn } from '../utils/cn';
import { trustGraphService } from '../services/trustGraphService';

type ExpiryOption = 'perpetual' | '1year' | '30days';

const CLAIM_TYPE_OPTIONS: Array<{ type: ClaimType; label: string; desc: string }> = [
  { type: 'CONTRACT_DEPLOYED', label: 'Contract Deployed', desc: 'Monad EVM contract' },
  { type: 'CHALLENGE_COMPLETED', label: 'Challenge Completed', desc: 'Hackathon or milestone' },
  { type: 'CONTRIBUTION_VERIFIED', label: 'Contribution Verified', desc: 'Commit or repository PR' },
];

const EXPIRY_OPTIONS: Array<{ id: ExpiryOption; label: string; desc: string }> = [
  { id: 'perpetual', label: 'Perpetual', desc: 'Permanent unless revoked' },
  { id: '1year', label: '1 Year', desc: 'Expires in 365 days' },
  { id: '30days', label: '30 Days', desc: 'Short-term milestone' },
];

/** Ordered on-chain lifecycle phases (AGENTS.md §9). "Anchored" renders
 *  only after the Monad receipt is confirmed by the hook — never earlier. */
const TX_PHASES: Array<{ key: TxStep; label: string }> = [
  { key: 'preparing', label: 'Preparing' },
  { key: 'waiting-wallet', label: 'Wallet Signature' },
  { key: 'submitted', label: 'Broadcast' },
  { key: 'confirming', label: 'Confirmation' },
  { key: 'confirmed', label: 'Anchored' },
];

const inputClass =
  'w-full bg-surface-subtle border border-surface-border p-2.5 text-xs text-ink placeholder-ink-dim font-mono focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors';

export const IssueAttestationPage: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { isAuthorized, isLoading: isCheckingAuth } = useIssuerStatus(address);
  const { issue, txStep, errorMessage, txHash, createdAttestation, reset } = useIssueAttestation();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const enter = shouldReduceMotion ? false : 'hidden';

  // Form states
  const [subject, setSubject] = useState('');
  const [claimType, setClaimType] = useState<ClaimType>('CONTRACT_DEPLOYED');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [manifestText, setManifestText] = useState('');
  const [evidenceHash, setEvidenceHash] = useState<`0x${string}` | ''>('');
  const [isComputingHash, setIsComputingHash] = useState(false);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>('perpetual');
  const [isLiveTx, setIsLiveTx] = useState(() => trustGraphService.getMode() === 'LIVE');
  // Tracks whether the in-flight/just-completed issuance is a real Monad tx,
  // so the on-chain lifecycle UI is only ever shown for genuine submissions.
  const [isLiveSubmit, setIsLiveSubmit] = useState(false);

  useEffect(() => {
    if (isConnected && trustGraphService.getMode() === 'LIVE') {
      setIsLiveTx(true);
    }
  }, [isConnected]);

  // Pre-fill demo templates based on claim type
  const loadDemoTemplate = (type: ClaimType) => {
    setClaimType(type);
    if (type === 'CONTRACT_DEPLOYED') {
      setTitle('Monad High-Throughput AMM Liquidity Router');
      setDescription('Verified deployment of parallelized swap router with zero storage conflict test benchmarks.');
      setEvidenceUrl('https://testnet.monadexplorer.com/address/0x4386926019A8B74431eBDeF7c2718E340621B903');
      setManifestText('Contract: 0x4386926019A8B74431eBDeF7c2718E340621B903\nChain: Monad Testnet (10143)\nBytecode verified against git commit: 8f421ca');
    } else if (type === 'CHALLENGE_COMPLETED') {
      setTitle('Monad Madness DeFi Benchmark: 10k TPS Finalist');
      setDescription('Reviewed technical benchmark submission reproducing 10,000 TPS under async execution simulator.');
      setEvidenceUrl('https://devpost.com/software/monad-parallel-amm');
      setManifestText('Challenge: Monad Madness DeFi Benchmark\nJury Score: 98/100\nExecution reproducibility confirmed.');
    } else {
      setTitle('Core revm Async Storage Pre-warm Patch');
      setDescription('Upstream pull request optimizing disk I/O cold storage reads by 32% under load.');
      setEvidenceUrl('https://github.com/monad-developers/node/pull/482');
      setManifestText('Repo: https://github.com/monad-developers/node/pull/482\nCommit: a812f04e1984\nMerged by core maintainer.');
    }
  };

  // Compute SHA-256 hash whenever manifest or URL changes
  useEffect(() => {
    let active = true;
    const calculate = async () => {
      const text = manifestText.trim() || evidenceUrl.trim();
      if (!text) {
        setEvidenceHash('');
        return;
      }
      setIsComputingHash(true);
      try {
        const hash = await computeSha256(text);
        if (active) setEvidenceHash(hash);
      } finally {
        if (active) setIsComputingHash(false);
      }
    };
    calculate();
    return () => {
      active = false;
    };
  }, [manifestText, evidenceUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !title.trim() || !evidenceUrl.trim()) return;

    let finalHash = evidenceHash;
    if (!finalHash) {
      finalHash = await computeSha256(manifestText.trim() || evidenceUrl.trim());
      setEvidenceHash(finalHash);
    }

    let expirySec = 0;
    const now = Math.floor(Date.now() / 1000);
    if (expiryOption === '1year') {
      expirySec = now + 365 * 86400;
    } else if (expiryOption === '30days') {
      expirySec = now + 30 * 86400;
    }

    const live = isLiveTx && isConnected;
    setIsLiveSubmit(live);

    await issue({
      subject: subject.trim() as `0x${string}`,
      claimType,
      claimTitle: title.trim(),
      claimDescription: description.trim(),
      evidenceUrl: evidenceUrl.trim(),
      evidenceHash: finalHash,
      evidenceManifest: manifestText.trim() || evidenceUrl.trim(),
      expiry: expirySec,
      isLiveOnChain: live,
    });
  };

  const handleReset = () => {
    setIsLiveSubmit(false);
    reset();
  };

  const isWrongNetwork = isConnected && chainId !== MONAD_TESTNET_CHAIN_ID;
  const txPending = txStep === 'preparing' || txStep === 'waiting-wallet' || txStep === 'submitted' || txStep === 'confirming';
  const activePhaseIndex = TX_PHASES.findIndex((p) => p.key === txStep);

  return (
    <div className="animate-page-enter max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
      <motion.div variants={staggerParent(0.09, 0.05)} initial={enter} animate="visible">
        {/* ─── Header ─────────────────────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <Terminal className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest-xl">
              Authorized Issuer Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">Issue Attestation</h1>
          <p className="text-xs text-ink-muted mt-1.5 max-w-2xl leading-relaxed font-mono">
            Record a new claim on Monad after reviewing the developer&apos;s evidence. The registry anchors
            the SHA-256 hash and issuer standing.
          </p>
        </motion.div>

        {/* ─── Issuer standing ────────────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-8">
          <Panel className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <ShieldCheck
                  className={cn(
                    'h-4 w-4 shrink-0 mt-0.5',
                    isConnected && isAuthorized ? 'text-status-verified' : 'text-ink-dim'
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <div className="text-xs text-ink mb-0.5">
                    {isConnected ? (
                      <span>
                        Connected: <strong className="font-mono">{shortenAddress(address)}</strong>
                      </span>
                    ) : (
                      <span>Wallet Not Connected — Sandbox Mode</span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] leading-relaxed">
                    {isConnected ? (
                      isAuthorized ? (
                        <span className="text-status-verified inline-flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          Recognized issuer in the TrustGraph registry
                        </span>
                      ) : (
                        <span className="text-status-pending">
                          Wallet not registered as an authorized issuer. Test in sandbox mode or request{' '}
                          <code className="text-status-pending">approveIssuer</code>.
                        </span>
                      )
                    ) : (
                      <span className="text-ink-dim">
                        Fill this form in sandbox mode, or connect an authorized Monad testnet wallet.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => loadDemoTemplate('CONTRACT_DEPLOYED')}
                className="shrink-0 px-2.5 py-1 bg-surface-subtle border border-surface-border hover:border-surface-border-strong text-ink-muted hover:text-ink font-mono text-[10px] uppercase tracking-widest transition-colors"
              >
                Load Demo
              </button>
            </div>
          </Panel>
        </motion.div>

        {/* ─── Success banner ─────────────────────────────────── */}
        <AnimatePresence>
          {txStep === 'confirmed' && createdAttestation && (
            <motion.div
              variants={fadeRise}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={settleTransition}
              className="mb-8"
            >
              <Panel className="p-5 border-status-verified/40">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-status-verified shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-ink mb-1">Attestation Recorded</h3>
                    {createdAttestation.transactionHash ? (
                      <p className="font-mono text-[10px] text-ink-muted mb-4">
                        #{createdAttestation.id} anchored on Monad Testnet — receipt confirmed. Public proof is
                        inspectable immediately.
                      </p>
                    ) : (
                      <p className="font-mono text-[10px] text-status-pending mb-4">
                        #{createdAttestation.id} recorded as a local sandbox fixture — not committed to Monad
                        Testnet.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/verify/${createdAttestation.id}`}
                        className="px-3.5 py-2 bg-status-verified hover:bg-status-verified/80 text-background font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>Inspect Proof</span>
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                      <Link
                        to={`/profile/${createdAttestation.subject}`}
                        className="px-3.5 py-2 bg-surface-raised border border-surface-border-strong text-ink text-xs font-medium hover:border-primary/50 transition-colors"
                      >
                        Subject Profile
                      </Link>
                      <button
                        onClick={handleReset}
                        className="px-3 py-2 text-[10px] text-ink-dim hover:text-ink font-mono uppercase tracking-widest transition-colors"
                      >
                        Issue Another
                      </button>
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Error banner ───────────────────────────────────── */}
        <AnimatePresence>
          {txStep === 'error' && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role="alert"
              className="mb-8 p-4 bg-status-revoked/10 border border-status-revoked/40 flex items-start gap-2.5"
            >
              <AlertTriangle className="h-4 w-4 text-status-revoked shrink-0 mt-0.5" aria-hidden="true" />
              <div className="font-mono text-[11px] text-status-revoked">
                <strong>Failed:</strong> {translateTxError(errorMessage)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Form ───────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 01 · Subject */}
          <motion.div variants={fadeRise}>
            <SectionHeader index="01" title="Subject Wallet" hint="The developer whose record carries this claim" className="mb-3" />
            <Panel className="p-5 space-y-3">
              <div>
                <label htmlFor="issue-subject" className="block text-xs text-ink-muted mb-1.5">
                  Subject Address (Recipient) *
                </label>
                <input
                  id="issue-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="0x…"
                  className={inputClass}
                />
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-[9px] text-ink-dim tracking-widest uppercase">Quick:</span>
                  <button
                    type="button"
                    onClick={() => setSubject(DEMO_WALLETS.DEVELOPER.address)}
                    className="font-mono text-[10px] text-primary hover:text-primary-bright transition-colors"
                  >
                    Sarah (0x3a48…)
                  </button>
                  {address && (
                    <button
                      type="button"
                      onClick={() => setSubject(address)}
                      className="font-mono text-[10px] text-ink-dim hover:text-ink ml-1 transition-colors"
                    >
                      My Wallet
                    </button>
                  )}
                </div>
              </div>
            </Panel>
          </motion.div>

          {/* 02 · Claim */}
          <motion.div variants={fadeRise}>
            <SectionHeader index="02" title="Claim Type & Description" hint="What the evidence establishes" className="mb-3" />
            <Panel className="p-5 space-y-4">
              <div>
                <span className="block text-xs text-ink-muted mb-2">Category *</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Claim category">
                  {CLAIM_TYPE_OPTIONS.map((item) => {
                    const active = claimType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setClaimType(item.type)}
                        aria-pressed={active}
                        className={cn(
                          'p-3 border text-left transition-colors',
                          active
                            ? 'bg-surface-raised border-primary/60 text-ink'
                            : 'bg-surface-subtle border-surface-border text-ink-muted hover:border-surface-border-strong hover:text-ink'
                        )}
                      >
                        <div className="text-xs font-medium">{item.label}</div>
                        <div className="font-mono text-[10px] text-ink-dim mt-0.5">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="issue-title" className="block text-xs text-ink-muted mb-1.5">
                  Claim Title *
                </label>
                <input
                  id="issue-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Production Streaming Payment Contract"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="issue-description" className="block text-xs text-ink-muted mb-1.5">
                  Reviewer Explanation *
                </label>
                <textarea
                  id="issue-description"
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the scope of work reviewed and what the evidence establishes…"
                  className={cn(inputClass, 'leading-relaxed')}
                />
              </div>
            </Panel>
          </motion.div>

          {/* 03 · Evidence */}
          <motion.div variants={fadeRise}>
            <SectionHeader index="03" title="Evidence Manifest & Cryptographic Hash" hint="Hashed locally; anchored on-chain only on live submissions" className="mb-3" />
            <Panel className="p-5 space-y-4">
              <div>
                <label htmlFor="issue-url" className="block text-xs text-ink-muted mb-1.5">
                  Evidence URL (Publicly Inspectable) *
                </label>
                <input
                  id="issue-url"
                  type="url"
                  required
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://github.com/… or https://testnet.monadexplorer.com/…"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="issue-manifest" className="block text-xs text-ink-muted mb-1.5">
                  Canonical Evidence Manifest
                </label>
                <textarea
                  id="issue-manifest"
                  rows={3}
                  value={manifestText}
                  onChange={(e) => setManifestText(e.target.value)}
                  placeholder="Specific commit, transaction hash, contract address, or test run…"
                  className={inputClass}
                />
              </div>

              <div className="bg-surface-subtle border border-surface-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="h-3.5 w-3.5 text-evidence" aria-hidden="true" />
                    <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest-xl">
                      Deterministic SHA-256
                    </span>
                  </div>
                  {isComputingHash && (
                    <span className="font-mono text-[9px] text-evidence animate-pulse tracking-widest uppercase">
                      Computing…
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-evidence/90 break-all select-all leading-relaxed">
                  {evidenceHash || '0x… (computed from evidence manifest)'}
                </div>
              </div>
            </Panel>
          </motion.div>

          {/* 04 · Validity */}
          <motion.div variants={fadeRise}>
            <SectionHeader index="04" title="Validity Duration" hint="Expiry is recorded on-chain" className="mb-3" />
            <Panel className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Validity duration">
                {EXPIRY_OPTIONS.map((opt) => {
                  const active = expiryOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExpiryOption(opt.id)}
                      aria-pressed={active}
                      className={cn(
                        'p-3 border text-left transition-colors',
                        active
                          ? 'bg-surface-raised border-primary/60 text-ink'
                          : 'bg-surface-subtle border-surface-border text-ink-muted hover:border-surface-border-strong hover:text-ink'
                      )}
                    >
                      <div className="text-xs font-medium">{opt.label}</div>
                      <div className="font-mono text-[10px] text-ink-dim mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          </motion.div>

          {/* Pre-submission ledger */}
          <motion.div variants={fadeRise}>
            <Panel className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest-xl">
                  Pre-Submission Ledger
                </span>
              </div>
              <div className="font-mono text-[10px] space-y-1 bg-surface-subtle p-3 border border-surface-border">
                <div className="flex justify-between">
                  <span className="text-ink-dim">Subject</span>
                  <span className="text-ink">{shortenAddress(subject, 6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Type</span>
                  <span className="text-ink">{claimType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Hash</span>
                  <span className="text-evidence">{evidenceHash ? shortenAddress(evidenceHash, 8) : 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Expiry</span>
                  <span className="text-ink">
                    {expiryOption === 'perpetual' ? 'Perpetual (0)' : expiryOption}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-dim">Network</span>
                  <span className="text-ink">Monad 10143</span>
                </div>
              </div>
            </Panel>
          </motion.div>

          {/* ─── Transaction lifecycle stepper (real Monad tx only) ─ */}
          <AnimatePresence>
            {txStep !== 'idle' && isLiveSubmit && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={settleTransition}
                aria-live="polite"
              >
                <Panel className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw
                      className={cn('h-3.5 w-3.5 text-primary', txPending && 'animate-spin')}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[10px] text-ink-muted uppercase tracking-widest-xl">
                      Monad Transaction Lifecycle
                    </span>
                    {txHash && (
                      <span className="font-mono text-[10px] text-evidence truncate ml-auto">
                        {shortenAddress(txHash, 6)}
                      </span>
                    )}
                  </div>
                  <ol className="flex items-center gap-1.5">
                    {TX_PHASES.map((phase, i) => {
                      const done = activePhaseIndex > i || txStep === 'confirmed';
                      const current = i === activePhaseIndex && txStep !== 'confirmed';
                      const failed = txStep === 'error' && i === Math.max(activePhaseIndex, 0);
                      return (
                        <li key={phase.key} className="flex-1 min-w-0">
                          <div
                            className={cn(
                              'h-0.5 mb-1.5 transition-colors duration-300',
                              failed
                                ? 'bg-status-revoked'
                                : done || current
                                  ? 'bg-primary'
                                  : 'bg-surface-border'
                            )}
                            aria-hidden="true"
                          />
                          <div
                            className={cn(
                              'font-mono text-[9px] uppercase tracking-widest truncate',
                              failed
                                ? 'text-status-revoked'
                                : current
                                  ? 'text-primary'
                                  : done
                                    ? 'text-ink-muted'
                                    : 'text-ink-faint'
                            )}
                          >
                            {phase.label}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-3 font-mono text-[10px] text-ink-muted flex items-center gap-1.5">
                    {txStep === 'waiting-wallet' && 'Awaiting signature — confirm the transaction in your wallet…'}
                    {txStep === 'submitted' && 'Broadcast to the Monad RPC — waiting for block inclusion…'}
                    {txStep === 'confirming' && 'Waiting for Monad block confirmation…'}
                    {txStep === 'confirmed' && 'Receipt confirmed on Monad — attestation is now public record.'}
                    {txStep === 'preparing' && 'Preparing transaction payload…'}
                    {txStep === 'error' && 'The transaction did not settle. No record was committed.'}
                  </div>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Local sandbox progress (no on-chain claim) ──────── */}
          <AnimatePresence>
            {txStep !== 'idle' && txStep !== 'error' && !isLiveSubmit && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={settleTransition}
                aria-live="polite"
              >
                <Panel className="p-4 border-status-pending/30">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 text-status-pending animate-spin" aria-hidden="true" />
                    <span className="font-mono text-[10px] text-status-pending uppercase tracking-widest-xl">
                      {txStep === 'confirmed' ? 'Local Fixture Recorded' : 'Recording Local Fixture…'}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-ink-muted">
                    {txStep === 'confirmed'
                      ? 'Stored in the local sandbox only — no Monad transaction was submitted or confirmed.'
                      : 'Writing attestation to the local sandbox — no Monad transaction is involved.'}
                  </p>
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── Submit ─────────────────────────────────────────── */}
          <motion.div variants={fadeRise} className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isConnected && (
                <label className="flex items-center gap-2 cursor-pointer select-none font-mono text-[10px] text-ink-muted uppercase tracking-widest">
                  <input
                    type="checkbox"
                    checked={isLiveTx}
                    onChange={(e) => setIsLiveTx(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span>Execute real Monad tx</span>
                </label>
              )}
              {isWrongNetwork && (
                <span className="font-mono text-[10px] text-status-pending uppercase tracking-widest">
                  Wrong network — switch to Monad 10143
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={txPending}
              className="w-full sm:w-auto px-6 py-3 bg-primary hover:bg-primary-bright text-white font-semibold text-xs transition-colors active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {txStep === 'waiting-wallet' && (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Confirm in Wallet…</span>
                </>
              )}
              {(txStep === 'submitted' || txStep === 'confirming') && (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{isLiveSubmit ? 'Anchoring on Monad…' : 'Recording local fixture…'}</span>
                </>
              )}
              {(txStep === 'idle' || txStep === 'confirmed' || txStep === 'error' || txStep === 'preparing') && (
                <>
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Issue &amp; Record Attestation</span>
                </>
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};

export const SubmitPage = IssueAttestationPage;
