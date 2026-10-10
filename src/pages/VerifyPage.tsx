import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserCheck, CheckCircle2, ArrowRight, X } from 'lucide-react';
import {
  useTrustProfile,
  useRevokeAttestation,
  type TxStep,
} from '../hooks/useTrustGraph';
import { shortenAddress, formatDate, getClaimTypeDetails } from '../utils/formatters';
import { Attestation } from '../types';
import { DEMO_WALLETS } from '../lib/contract/config';
import { translateTxError } from '../lib/blockchain/errors';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { ValidityBadge } from '../components/shared/ValidityBadge';
import { fadeRise, staggerParent, settleTransition } from '../lib/motion';
import { cn } from '../utils/cn';

type QueueTab = 'ALL' | 'VALID' | 'REVOKED';

const REVOKE_TX_LABELS: Record<TxStep, string> = {
  idle: 'Ready',
  preparing: 'Preparing…',
  'waiting-wallet': 'Awaiting wallet signature…',
  submitted: 'Recording local fixture…',
  confirming: 'Confirming…',
  confirmed: 'Recorded (local sandbox)',
  error: 'Failed',
};

export const VerifyPage: React.FC = () => {
  const { profile, isLoading, refetch } = useTrustProfile(DEMO_WALLETS.DEVELOPER.address);
  const { revoke, txStep: revokeTxStep, errorMessage: revokeError } = useRevokeAttestation();
  const shouldReduceMotion = useReducedMotion() ?? false;

  const enter = shouldReduceMotion ? false : 'hidden';

  const [activeTab, setActiveTab] = useState<QueueTab>('ALL');
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const attestations = profile?.attestations || [];
  const validCount = attestations.filter((a) => a.validity === 'VALID').length;
  const revokedCount = attestations.filter((a) => a.validity === 'REVOKED').length;

  const displayed = attestations.filter((a) => {
    if (activeTab === 'VALID') return a.validity === 'VALID';
    if (activeTab === 'REVOKED') return a.validity === 'REVOKED';
    return true;
  });

  const revokePending =
    revokeTxStep === 'preparing' || revokeTxStep === 'waiting-wallet' || revokeTxStep === 'submitted';

  const closeRevokeModal = () => {
    if (revokePending) return;
    setIsModalOpen(false);
    setSelectedAttestation(null);
    setRevokeReason('');
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttestation || !revokeReason.trim()) return;

    try {
      const revokedId = selectedAttestation.id;
      await revoke(revokedId, revokeReason.trim());
      setNotification(`Attestation #${revokedId} marked REVOKED. Historical record preserved.`);
      setIsModalOpen(false);
      setSelectedAttestation(null);
      setRevokeReason('');
      refetch();
    } catch {
      // Error state is surfaced inline via the hook's errorMessage + translateTxError.
    }
  };

  const tabs: Array<{ key: QueueTab; label: string; count: number }> = [
    { key: 'ALL', label: 'ALL', count: attestations.length },
    { key: 'VALID', label: 'VALID', count: validCount },
    { key: 'REVOKED', label: 'REVOKED', count: revokedCount },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      <motion.div variants={staggerParent(0.08, 0.05)} initial={enter} animate="visible">
        {/* ─── Header ────────────────────────────────────────── */}
        <motion.div variants={fadeRise} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <UserCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <span className="font-mono text-[10px] text-ink-dim uppercase tracking-widest-xl">
                Authorized Reviewer Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              Verifier Review Queue
            </h1>
            <p className="text-xs text-ink-muted mt-2 max-w-2xl leading-relaxed">
              Triage recorded claims, inspect their evidence, and revoke attestations for cause. This
              portal operates on the local sandbox — revocations are recorded locally and no Monad
              transaction is submitted.
            </p>
          </div>

          <Link
            to="/issue"
            className="shrink-0 self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-bright text-white font-semibold text-xs rounded-sm transition-colors"
          >
            <span>Issue New Attestation</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </motion.div>

        {/* ─── Notification banner ───────────────────────────── */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={settleTransition}
              className="mb-6"
              role="status"
            >
              <div className="flex items-start justify-between gap-3 p-4 bg-status-verified/10 border border-status-verified/40">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-status-verified shrink-0 mt-0.5" aria-hidden="true" />
                  <span className="text-xs text-status-verified font-mono">{notification}</span>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  aria-label="Dismiss notification"
                  className="text-status-verified/70 hover:text-ink transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Filter rail ───────────────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-6">
          <SectionHeader
            index="01"
            title="Triage Filter"
            hint="Narrow the queue by current validity"
            className="mb-4"
          />
          <div className="flex items-center gap-2" role="group" aria-label="Filter attestations by validity">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 border font-mono text-xs transition-colors',
                  activeTab === tab.key
                    ? 'bg-surface-raised border-primary/50 text-ink'
                    : 'bg-transparent border-surface-border text-ink-dim hover:text-ink hover:border-surface-border-strong'
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Queue list ────────────────────────────────────── */}
        <motion.div variants={fadeRise}>
          <SectionHeader
            index="02"
            title="Attestation Queue"
            hint={isLoading ? 'Fetching from registry…' : `${displayed.length} record${displayed.length === 1 ? '' : 's'} in view`}
            className="mb-4"
          />

          <div className="space-y-3">
            {displayed.map((att) => {
              const claimType = getClaimTypeDetails(att.claimType);

              return (
                <Panel as="article" key={att.id} interactive className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest',
                            claimType.tagBg
                          )}
                        >
                          {claimType.label}
                        </span>
                        <ValidityBadge status={att.validity} />
                        <span className="font-mono text-xs text-ink-dim">#{att.id}</span>
                        {!att.transactionHash && (
                          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-status-pending/40 text-status-pending bg-status-pending/[0.07]">
                            Local Fixture
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-ink truncate">{att.claimTitle}</h3>

                      <div className="text-xs text-ink-muted font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>Subject: {shortenAddress(att.subject)}</span>
                        <span>Issued: {formatDate(att.issuedAt)}</span>
                      </div>

                      {att.revoked && att.revocationReason && (
                        <p className="text-[11px] text-status-revoked/90 font-mono leading-relaxed">
                          Revoked for cause: “{att.revocationReason}”
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
                      <Link
                        to={`/verify/${att.id}`}
                        className="px-3 py-1.5 bg-surface-raised hover:bg-surface-border text-ink border border-surface-border font-mono text-xs transition-colors"
                      >
                        Audit Details
                      </Link>

                      {!att.revoked && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAttestation(att);
                            setRevokeReason('');
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-status-revoked/10 hover:bg-status-revoked/20 text-status-revoked border border-status-revoked/40 font-mono text-xs transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </Panel>
              );
            })}

            {!isLoading && displayed.length === 0 && (
              <Panel className="p-10 text-center">
                <p className="font-mono text-xs text-ink-dim mb-4">
                  No attestations in this view.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className="px-3.5 py-1.5 bg-surface-raised hover:bg-surface-border text-ink border border-surface-border font-mono text-xs transition-colors"
                >
                  Reset Filter
                </button>
              </Panel>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Revocation modal ────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && selectedAttestation && (
          <motion.div
            key="revoke-overlay"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={closeRevokeModal}
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={settleTransition}
              role="dialog"
              aria-modal="true"
              aria-labelledby="revoke-modal-title"
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Panel className="p-6 bg-surface-raised">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 id="revoke-modal-title" className="text-base font-bold text-ink">
                    Revoke Attestation #{selectedAttestation.id}
                  </h3>
                  <button
                    type="button"
                    onClick={closeRevokeModal}
                    disabled={revokePending}
                    aria-label="Close revocation dialog"
                    className="text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  Revocation is recorded in the local sandbox. The historical record is preserved with
                  status <code className="font-mono text-status-revoked">REVOKED</code> and a reason. No
                  Monad transaction is submitted.
                </p>

                <form onSubmit={handleRevokeSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="revoke-reason-modal" className="block font-mono text-[10px] uppercase tracking-widest-xl text-status-revoked mb-1.5">
                      Reason for Revocation *
                    </label>
                    <textarea
                      id="revoke-reason-modal"
                      required
                      rows={3}
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      placeholder="e.g. Audit revealed a security issue; evidence invalidated; work deprecated…"
                      className="w-full bg-surface-subtle border border-surface-border p-2.5 text-xs text-ink placeholder-ink-dim font-mono focus:outline-none focus:border-status-revoked/60 focus:ring-1 focus:ring-status-revoked/30 transition-colors"
                    />
                  </div>

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
                      {REVOKE_TX_LABELS[revokeTxStep]}
                    </span>
                  </div>

                  <AnimatePresence>
                    {revokeTxStep === 'error' && revokeError && (
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

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={closeRevokeModal}
                      disabled={revokePending}
                      className="px-3 py-2 text-xs text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={revokePending || revokeTxStep === 'confirmed'}
                      className="px-4 py-2 bg-status-revoked hover:bg-status-revoked/80 disabled:opacity-40 text-background font-semibold text-xs transition-colors"
                    >
                      {revokeTxStep === 'waiting-wallet' ? 'Sign in Wallet…' : 'Confirm Revocation'}
                    </button>
                  </div>
                </form>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VerifyPage;
