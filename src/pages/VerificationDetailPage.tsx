import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Ban,
  Share2,
  Fingerprint,
  Loader2,
} from 'lucide-react';
import { useAttestation, useRevokeAttestation } from '../hooks/useTrustGraph';
import { ValidityBadge } from '../components/shared/ValidityBadge';
import { EvidenceHashWidget } from '../components/shared/EvidenceHashWidget';
import { shortenAddress, formatDate, formatDateTime, getClaimTypeDetails, computeSha256 } from '../utils/formatters';
import { TRUST_GRAPH_REGISTRY_ADDRESS, getExplorerAddressUrl, getExplorerTxUrl } from '../lib/contract/config';
import { trustGraphService } from '../services/trustGraphService';
import { translateTxError } from '../lib/blockchain/errors';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { fadeRise, settleTransition, staggerParent } from '../lib/motion';
import { cn } from '../utils/cn';

export const VerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const activeId = id || '1';
  const { attestation, isLoading, error, refetch } = useAttestation(activeId);
  const { address } = useAccount();
  const { revoke, txStep: revokeTxStep, errorMessage: revokeError } = useRevokeAttestation();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const enter = shouldReduceMotion ? false : 'hidden';

  // Local verification test state
  const [testContent, setTestContent] = useState('');
  const [isComputing, setIsComputing] = useState(false);
  const [hashResult, setHashResult] = useState<{
    tested: boolean;
    matches: boolean;
    computedHash: string;
  } | null>(null);

  // Revocation modal state
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSuccessMsg, setRevokeSuccessMsg] = useState<string | null>(null);
  const [revokeErrorMsg, setRevokeErrorMsg] = useState<string | null>(null);

  const handleTestHash = async () => {
    if (!testContent.trim() || !attestation || isComputing) return;
    setIsComputing(true);
    try {
      const computed = await computeSha256(testContent);
      const matches = computed.toLowerCase() === attestation.evidenceHash.toLowerCase();
      setHashResult({ tested: true, matches, computedHash: computed });
    } finally {
      setIsComputing(false);
    }
  };

  const handlePreloadManifest = () => {
    if (attestation?.evidenceManifest) {
      setTestContent(attestation.evidenceManifest);
    } else if (attestation?.evidenceUrl) {
      setTestContent(attestation.evidenceUrl);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeReason.trim() || !attestation) return;

    setRevokeErrorMsg(null);
    try {
      const isLive = trustGraphService.getMode() === 'LIVE' && Boolean(address);
      await revoke(attestation.id, revokeReason.trim(), { isLiveOnChain: isLive });
      setIsRevoking(false);
      setRevokeReason('');
      setRevokeSuccessMsg(
        isLive
          ? 'Attestation revoked on Monad Testnet — receipt confirmed. Historical record preserved on-chain.'
          : 'Attestation marked REVOKED in the local sandbox. Historical record preserved — no Monad transaction was submitted.'
      );
      refetch();
    } catch {
      // Error state is surfaced inline via the hook's errorMessage + translateTxError.
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-block h-6 w-6 border-2 border-surface-border border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-ink-muted text-sm font-mono">Loading attestation #{activeId}…</p>
      </div>
    );
  }

  if (error || !attestation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24">
        <Panel className="p-10 text-center">
          <AlertTriangle className="h-8 w-8 text-ink-dim mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink mb-2">Attestation Not Found</h2>
          <p className="text-ink-muted text-sm mb-8 font-mono">
            No attestation found with ID #{activeId} on the registry.
          </p>
          <Link
            to="/verify/1"
            className="inline-block px-4 py-2 bg-primary hover:bg-primary-bright text-white font-medium text-xs transition-colors"
          >
            Inspect Sample Attestation #1
          </Link>
        </Panel>
      </div>
    );
  }

  const claimType = getClaimTypeDetails(attestation.claimType);

  const canRevoke =
    !attestation.revoked &&
    address &&
    (address.toLowerCase() === attestation.issuer.toLowerCase() ||
      trustGraphService.isIssuerAuthorized(address));

  const revokePending = revokeTxStep === 'waiting-wallet' || revokeTxStep === 'submitted' || revokeTxStep === 'preparing';

  return (
    <div className="animate-page-enter max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
      <motion.div variants={staggerParent(0.09, 0.05)} initial={enter} animate="visible">
        {/* ─── Back link ──────────────────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-5">
          <Link
            to={`/profile/${attestation.subject}`}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors font-mono"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Back to Subject Profile</span>
          </Link>
        </motion.div>

        {/* ─── Record header ──────────────────────────────────── */}
        <motion.div variants={fadeRise}>
          <Panel className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={cn('inline-flex items-center px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest', claimType.tagBg)}>
                  {claimType.label}
                </span>
                <ValidityBadge status={attestation.validity} />
              </div>

              <div className="flex items-center gap-3 font-mono text-xs text-ink-dim">
                <Link
                  to={`/graph/${attestation.subject}`}
                  className="hover:text-ink inline-flex items-center gap-1.5 transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  <span>Inspect in Graph</span>
                </Link>
                <span className="text-ink-faint">·</span>
                <span>Record ID: #{attestation.id}</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight mb-2">
              {attestation.claimTitle}
            </h1>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-3xl mb-1">
              {attestation.claimDescription}
            </p>

            <AnimatePresence>
              {attestation.revoked && (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-status-revoked/10 border border-status-revoked/40 text-xs text-status-revoked"
                >
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Ban className="h-4 w-4" aria-hidden="true" />
                    <span>Historical Attestation Revoked</span>
                  </div>
                  <p className="leading-relaxed text-ink-muted">
                    Reason: &quot;{attestation.revocationReason || 'Revoked by authorized reviewer.'}&quot;
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {revokeSuccessMsg && (
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-status-verified/10 border border-status-verified/40 text-xs text-status-verified flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{revokeSuccessMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        </motion.div>

        {/* ─── Verification matrix ────────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-5">
          <h2 className="font-mono text-[11px] uppercase tracking-widest-xl text-ink-muted">
            Independent Verification Matrix
          </h2>
        </motion.div>

        <div className="space-y-6 mb-10">
          {/* 01 — Issuer standing */}
          <motion.div variants={fadeRise}>
            <SectionHeader
              index="01"
              title="Reviewing Authority"
              hint="Who verified this claim — and whether that privilege still stands"
              className="mb-3"
            />
            <Panel className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck
                    className={cn('h-5 w-5', attestation.issuerAuthorized ? 'text-status-verified' : 'text-status-revoked')}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {attestation.issuerName || 'Authorized Ecosystem Reviewer'}
                    </div>
                    <a
                      href={getExplorerAddressUrl(attestation.issuer)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] text-ink-dim hover:text-ink-muted transition-colors inline-flex items-center gap-1"
                    >
                      {shortenAddress(attestation.issuer, 8)}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                <span
                  className={cn(
                    'font-mono text-[10px] uppercase tracking-widest px-2 py-1 border',
                    attestation.issuerAuthorized
                      ? 'text-status-verified border-status-verified/40 bg-status-verified/10'
                      : 'text-status-invalid-issuer border-status-invalid-issuer/40 border-dashed'
                  )}
                >
                  {attestation.issuerAuthorized ? 'Authorized Issuer' : 'Unauthorized / Revoked'}
                </span>
              </div>

              <div className="pt-3 border-t border-surface-border font-mono text-xs">
                <div className="text-ink-dim mb-1 uppercase tracking-widest text-[10px]">Registry Authorization</div>
                {attestation.issuerAuthorized ? (
                  <span className="text-status-verified inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Approved in TrustGraphRegistry.sol</span>
                  </span>
                ) : (
                  <span className="text-status-revoked inline-flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Issuer privilege revoked from registry</span>
                  </span>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* 02 — Evidence + hash verifier */}
          <motion.div variants={fadeRise}>
            <SectionHeader
              index="02"
              title="Evidence & Cryptographic Anchor"
              hint="Inspect the source, recompute the hash, compare against the chain"
              className="mb-3"
            />
            <Panel className="p-5 space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest-xl text-ink-dim mb-1.5">
                  Off-Chain Evidence Source
                </div>
                <a
                  href={attestation.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-evidence hover:text-evidence/80 inline-flex items-start gap-1.5 font-mono text-xs underline decoration-evidence/40 break-all transition-colors"
                >
                  <span>{attestation.evidenceUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                </a>
              </div>

              {attestation.evidenceManifest && (
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest-xl text-ink-dim mb-1.5">
                    Canonical Evidence Manifest
                  </div>
                  <pre className="p-3 bg-surface-subtle border border-surface-border text-[11px] font-mono text-ink-muted whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {attestation.evidenceManifest}
                  </pre>
                </div>
              )}

              <EvidenceHashWidget hash={attestation.evidenceHash} status={attestation.validity} />

              {/* Client-side SHA-256 verifier */}
              <div className="pt-4 border-t border-surface-border">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-mono font-semibold text-ink inline-flex items-center gap-1.5">
                    <FileCheck className="h-3.5 w-3.5 text-evidence" aria-hidden="true" />
                    <span>Independent Hash Recomputation</span>
                  </span>
                  <button
                    onClick={handlePreloadManifest}
                    className="font-mono text-[11px] text-ink-dim hover:text-ink underline underline-offset-2 transition-colors"
                  >
                    Pre-load Recorded Manifest
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={testContent}
                  onChange={(e) => setTestContent(e.target.value)}
                  placeholder="Paste or modify evidence text to test whether its SHA-256 hash matches the recorded anchor…"
                  aria-label="Evidence text to hash"
                  className="w-full bg-surface-subtle border border-surface-border p-2.5 text-xs text-ink font-mono placeholder-ink-dim focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors mb-2"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestHash}
                    disabled={!testContent.trim() || isComputing}
                    className="px-3.5 py-1.5 bg-surface-raised hover:border-primary/50 border border-surface-border-strong disabled:opacity-40 text-ink font-mono text-xs transition-colors inline-flex items-center gap-2"
                  >
                    {isComputing && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-evidence" aria-hidden="true" />
                    )}
                    Compute &amp; Compare Hash
                  </button>

                  <AnimatePresence mode="wait">
                    {hashResult?.tested && (
                      <motion.div
                        key={hashResult.computedHash}
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, x: -6 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={settleTransition}
                        className={cn(
                          'text-xs font-mono inline-flex items-center gap-2 px-3 py-1.5 border',
                          hashResult.matches
                            ? 'text-status-verified border-status-verified/40 bg-status-verified/10'
                            : 'text-status-revoked border-status-revoked/40 bg-status-revoked/10'
                        )}
                        role="status"
                      >
                        {hashResult.matches ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {hashResult.matches
                            ? 'MATCH — evidence text matches the on-chain hash exactly.'
                            : 'MISMATCH — computed hash does not match the recorded hash.'}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {hashResult?.tested && !hashResult.matches && (
                  <div className="mt-3 font-mono text-[10px] text-ink-dim leading-relaxed">
                    <Fingerprint className="h-3 w-3 inline mr-1 -mt-0.5" aria-hidden="true" />
                    Computed <span className="text-ink-muted break-all">{shortenAddress(hashResult.computedHash, 8)}</span>
                    {' '}vs anchor <span className="text-ink-muted break-all">{shortenAddress(attestation.evidenceHash, 8)}</span>
                  </div>
                )}
              </div>
            </Panel>
          </motion.div>

          {/* 03 — Lifecycle & transaction */}
          <motion.div variants={fadeRise}>
            <SectionHeader
              index="03"
              title="Lifecycle & Monad Transaction"
              hint="When it was issued, whether it stands, and where to verify independently"
              className="mb-3"
            />
            <Panel className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs mb-4">
                <div>
                  <div className="text-ink-dim uppercase tracking-widest text-[10px] mb-1">Issued</div>
                  <div className="text-ink">{formatDateTime(attestation.issuedAt)}</div>
                </div>

                <div>
                  <div className="text-ink-dim uppercase tracking-widest text-[10px] mb-1">Expiration</div>
                  <div className="text-ink">
                    {attestation.expiry === 0 ? (
                      <span className="text-status-verified">Perpetual — no expiry</span>
                    ) : (
                      <span>
                        {formatDate(attestation.expiry)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-ink-dim uppercase tracking-widest text-[10px] mb-1">Revocation</div>
                  <div>
                    {attestation.revoked ? (
                      <span className="text-status-revoked">Revoked</span>
                    ) : (
                      <span className="text-status-verified">Standing (Active)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border font-mono text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-ink-dim uppercase tracking-widest text-[10px]">Monad Transaction</span>
                  {attestation.transactionHash ? (
                    <a
                      href={getExplorerTxUrl(attestation.transactionHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-evidence hover:text-evidence/80 underline decoration-evidence/40 underline-offset-2 inline-flex items-center gap-1.5 break-all transition-colors"
                    >
                      <span className="break-all">{attestation.transactionHash}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-status-pending inline-flex items-center gap-1.5">
                      Local Sandbox Fixture — Not Committed to Monad Testnet
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-ink-dim uppercase tracking-widest text-[10px]">Registry Contract</span>
                  <a
                    href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-muted hover:text-ink inline-flex items-center gap-1.5 transition-colors"
                  >
                    <span>{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 8)}</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* ─── Reviewer management: revoke ────────────────────── */}
        {canRevoke && (
          <motion.div variants={fadeRise}>
            <Panel className="p-6 border-status-revoked/30">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <h3 className="text-sm font-semibold text-ink">Reviewer Management Action</h3>
                {!isRevoking && (
                  <button
                    onClick={() => setIsRevoking(true)}
                    className="px-3.5 py-1.5 bg-status-revoked/10 hover:bg-status-revoked/20 text-status-revoked border border-status-revoked/40 font-mono text-xs transition-colors"
                  >
                    Revoke Attestation
                  </button>
                )}
              </div>
              <p className="text-xs text-ink-muted mb-1">
                You are connected as an authorized reviewer with privileges to revoke this attestation.
                Revocation preserves the historical record and requires a public reason.
              </p>

              {isRevoking && (
                <form onSubmit={handleRevokeSubmit} className="mt-4 pt-4 border-t border-surface-border space-y-3">
                  <label htmlFor="revoke-reason" className="font-mono text-[10px] uppercase tracking-widest-xl text-status-revoked block">
                    Revocation Rationale (recorded locally)
                  </label>
                  <textarea
                    id="revoke-reason"
                    required
                    rows={2}
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="e.g. Audit revealed a security issue; evidence URL invalid; work deprecated…"
                    className="w-full bg-surface-subtle border border-surface-border p-2.5 text-xs text-ink placeholder-ink-dim focus:outline-none focus:border-status-revoked/60 transition-colors font-mono"
                  />

                  <div className="font-mono text-[10px] uppercase tracking-widest-xl text-ink-dim flex items-center gap-2">
                    Record State
                    <span
                      className={cn(
                        'px-2 py-0.5 border',
                        revokeTxStep === 'error' && 'text-status-revoked border-status-revoked/40',
                        revokePending && 'text-status-pending border-status-pending/40',
                        revokeTxStep === 'confirmed' && 'text-status-verified border-status-verified/40',
                        revokeTxStep === 'idle' && 'text-ink-dim border-surface-border'
                      )}
                    >
                      {revokeTxStep === 'idle' && 'Ready'}
                      {revokeTxStep === 'preparing' && 'Preparing…'}
                      {revokeTxStep === 'waiting-wallet' && 'Awaiting wallet signature…'}
                      {revokeTxStep === 'submitted' && (trustGraphService.getMode() === 'LIVE' ? 'Broadcasting to Monad…' : 'Recording local fixture…')}
                      {revokeTxStep === 'confirming' && 'Waiting for block confirmation…'}
                      {revokeTxStep === 'confirmed' && (trustGraphService.getMode() === 'LIVE' ? 'Revoked on-chain (Monad 10143)' : 'Recorded (local sandbox)')}
                      {revokeTxStep === 'error' && 'Failed'}
                    </span>
                  </div>

                  <AnimatePresence>
                    {revokeError && (
                      <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        role="alert"
                        className="p-3 bg-status-revoked/10 border border-status-revoked/40 text-xs text-status-revoked font-mono"
                      >
                        {translateTxError(revokeError)}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={revokePending || revokeTxStep === 'confirmed'}
                      className="px-4 py-2 bg-status-revoked hover:bg-status-revoked/80 disabled:opacity-40 text-background font-semibold text-xs transition-colors"
                    >
                      {revokeTxStep === 'waiting-wallet' ? 'Sign in Wallet…' : 'Confirm Revocation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRevoking(false)}
                      disabled={revokePending}
                      className="px-3 py-2 text-xs text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </Panel>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export const ProofDetailPage = VerificationDetailPage;
