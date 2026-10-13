import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  UserCheck,
  CheckCircle2,
  ArrowRight,
  X,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { trustGraphService } from '../services/trustGraphService';
import { api, WorkSubmissionResponse } from '../services/api';
import {
  useTrustProfile,
  useAllAttestations,
  useRevokeAttestation,
  type TxStep,
} from '../hooks/useTrustGraph';
import {
  useVerifierStatus,
  useVerifierQueue,
  useVerifyWork,
  useRejectWork,
  useRevokeWork,
} from '../hooks/useWorkRegistry';
import {
  shortenAddress,
  formatDate,
  formatDateTime,
  getClaimTypeDetails,
} from '../utils/formatters';
import { Attestation, WorkSubmission, ClaimType } from '../types';
import { DEMO_WALLETS, PROOF_OF_WORK_REGISTRY_CONFIGURED } from '../lib/contract/config';
import { translateTxError } from '../lib/blockchain/errors';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { ValidityBadge } from '../components/shared/ValidityBadge';
import { fadeRise, staggerParent, settleTransition } from '../lib/motion';
import { cn } from '../utils/cn';

type QueueTab = 'SUBMISSIONS' | 'ALL' | 'VALID' | 'REVOKED';

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
  const { address } = useAccount();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const enter = shouldReduceMotion ? false : 'hidden';

  // Verifier standing & on-chain queue
  const { isVerifier, isLoading: isVerifierLoading, error: verifierError } = useVerifierStatus(address);
  const {
    pendingWorks: onChainPending = [],
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useVerifierQueue();
  const { verify: verifyWorkOnChain, isConfirming: isVerifyingOnChain } = useVerifyWork();
  const { reject: rejectWorkOnChain, isConfirming: isRejectingOnChain } = useRejectWork();
  const { revoke: revokeWorkOnChain, isConfirming: isRevokingWorkOnChain } = useRevokeWork();

  // Attestations
  const { data: allAttestations = [], isLoading: isAttestationsLoading, refetch: refetchAttestations } = useAllAttestations();
  const { profile, refetch: refetchProfile } = useTrustProfile(DEMO_WALLETS.DEVELOPER.address);
  const { revoke, txStep: revokeTxStep, errorMessage: revokeError } = useRevokeAttestation();

  // Local submissions from trustGraphService (demo / local mode)
  const isDemoMode = trustGraphService.getMode() === 'DEMO';
  const [localSubmissions, setLocalSubmissions] = useState<WorkSubmission[]>(() =>
    isDemoMode ? trustGraphService.getSubmissions() : []
  );

  // Synchronize storage updates for local submissions
  useEffect(() => {
    const handleStorageUpdate = () => {
      setLocalSubmissions(trustGraphService.getMode() === 'DEMO' ? trustGraphService.getSubmissions() : []);
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  // MongoDB submissions state
  const [mongoSubmissions, setMongoSubmissions] = useState<WorkSubmissionResponse[]>([]);
  const [isLoadingMongo, setIsLoadingMongo] = useState(false);

  const fetchMongoSubmissions = useCallback(async () => {
    setIsLoadingMongo(true);
    try {
      const res = await api.submissions.getPublic();
      if (res.success && Array.isArray(res.submissions)) {
        setMongoSubmissions(res.submissions);
      }
    } catch (err) {
      console.warn('Failed to fetch MongoDB submissions:', err);
    } finally {
      setIsLoadingMongo(false);
    }
  }, []);

  useEffect(() => {
    fetchMongoSubmissions();
  }, [fetchMongoSubmissions]);

  const mappedMongo: WorkSubmission[] = mongoSubmissions.map((ms): WorkSubmission => ({
    id: ms.workId || ms._id,
    mongoId: ms._id,
    worker: ms.subjectAddress as `0x${string}`,
    claimType: ms.workType as ClaimType,
    title: ms.title,
    description: ms.description,
    evidenceUrl: ms.evidenceUrl,
    evidenceManifest: ms.evidenceManifest,
    evidenceHash: ms.evidenceHash as `0x${string}`,
    submittedAt: Math.floor(new Date(ms.createdAt).getTime() / 1000),
    status: ms.status === 'VERIFIED' ? 'APPROVED' : ms.status === 'REJECTED' ? 'REJECTED' : 'PENDING',
    rejectionReason: ms.statusReason,
  }));

  // Combined pending / submissions data
  const combinedPending: WorkSubmission[] = [
    ...onChainPending.map((ow): WorkSubmission => ({
      id: ow.workId,
      worker: ow.worker,
      claimType:
        ow.workType === 'SMART_CONTRACT'
          ? 'CONTRACT_DEPLOYED'
          : ow.workType === 'GITHUB_CONTRIBUTION'
          ? 'CONTRIBUTION_VERIFIED'
          : 'CHALLENGE_COMPLETED',
      title: ow.title || `${ow.workType} (On-chain)`,
      description: ow.description || `Proof of work registered on Monad Testnet with evidence hash ${ow.evidenceHash}`,
      evidenceUrl: ow.metadataUri,
      evidenceManifest: `Evidence URI: ${ow.metadataUri}\nHash: ${ow.evidenceHash}`,
      evidenceHash: ow.evidenceHash,
      submittedAt: ow.createdAt,
      status: 'PENDING',
    })),
    ...mappedMongo.filter(
      (ms) => !onChainPending.some((ow) => ow.workId.toLowerCase() === ms.id.toLowerCase())
    ),
    ...(isDemoMode ? localSubmissions : []).filter(
      (ls) => !onChainPending.some((ow) => ow.workId.toLowerCase() === ls.id.toLowerCase()) &&
              !mappedMongo.some((ms) => ms.id.toLowerCase() === ls.id.toLowerCase())
    ),
  ];

  // Guaranteed definition for submissions so it is never undefined
  const submissions: WorkSubmission[] = combinedPending;
  const pendingSubmissionsCount = submissions.filter((s) => s.status === 'PENDING').length;

  // Active tab state
  const [activeTab, setActiveTab] = useState<QueueTab>('SUBMISSIONS');

  // Attestation triage
  const attestationsList = allAttestations.length > 0 ? allAttestations : (profile?.attestations || []);
  const validCount = attestationsList.filter((a) => a.validity === 'VALID').length;
  const revokedCount = attestationsList.filter((a) => a.validity === 'REVOKED').length;

  const displayedAttestations = attestationsList.filter((a) => {
    if (activeTab === 'VALID') return a.validity === 'VALID';
    if (activeTab === 'REVOKED') return a.validity === 'REVOKED';
    return true;
  });

  // Action in progress state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Revocation modal state
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokingAttestation, setIsRevokingAttestation] = useState(false);

  // Rejection modal state
  const [selectedSubmissionToReject, setSelectedSubmissionToReject] = useState<WorkSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  // Notification message
  const [notification, setNotification] = useState<string | null>(null);

  const revokePending =
    revokeTxStep === 'preparing' ||
    revokeTxStep === 'waiting-wallet' ||
    revokeTxStep === 'submitted' ||
    isRevokingWorkOnChain;

  const closeRevokeModal = () => {
    if (revokePending) return;
    setIsModalOpen(false);
    setSelectedAttestation(null);
    setRevokeReason('');
  };

  const handleApproveSubmission = async (sub: WorkSubmission) => {
    setApprovingId(sub.id);
    setNotification(null);
    try {
      if (sub.id.startsWith('0x') && sub.id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        if (!isVerifier) {
          throw new Error('Connected wallet is not authorized as a verifier on Monad Testnet.');
        }
        await verifyWorkOnChain(sub.id as `0x${string}`);
        setNotification(`Work item #${shortenAddress(sub.id)} approved and confirmed VERIFIED on Monad Testnet.`);
        await refetchQueue();
      } else {
        const attId = `att-${Date.now()}`;
        if (sub.mongoId) {
          await api.submissions.review(sub.mongoId, {
            status: 'VERIFIED',
            reviewerAddress: address,
          });
          setNotification(`Submission "${sub.title}" verified and persisted in MongoDB.`);
          await fetchMongoSubmissions();
        } else {
          await trustGraphService.approveSubmission(sub.id, attId);
          setNotification(`Submission "${sub.title}" marked APPROVED in local reviewer queue.`);
          setLocalSubmissions(trustGraphService.getSubmissions());
        }
      }
      refetchAttestations();
      refetchProfile();
    } catch (err: unknown) {
      setNotification(`Verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionToReject || !rejectReason.trim()) return;

    setRejectError(null);
    setIsRejecting(true);
    try {
      const sub = selectedSubmissionToReject;
      if (sub.id.startsWith('0x') && sub.id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        if (!isVerifier) {
          throw new Error('Connected wallet is not authorized as a verifier on Monad Testnet.');
        }
        await rejectWorkOnChain(sub.id as `0x${string}`, rejectReason.trim());
        setNotification(`Work item "${sub.title}" rejected on Monad Testnet with recorded rationale.`);
        await refetchQueue();
      } else {
        if (sub.mongoId) {
          await api.submissions.review(sub.mongoId, {
            status: 'REJECTED',
            statusReason: rejectReason.trim(),
            reviewerAddress: address,
          });
          setNotification(`Submission "${sub.title}" rejected and persisted in MongoDB.`);
          await fetchMongoSubmissions();
        } else {
          await trustGraphService.rejectSubmission(sub.id, rejectReason.trim());
          setNotification(`Submission "${sub.title}" marked REJECTED.`);
          setLocalSubmissions(trustGraphService.getSubmissions());
        }
      }
      setSelectedSubmissionToReject(null);
      setRejectReason('');
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Failed to reject submission.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttestation || !revokeReason.trim()) return;

    setIsRevokingAttestation(true);
    try {
      const id = selectedAttestation.id;
      if (id.startsWith('0x') && id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        await revokeWorkOnChain(id as `0x${string}`, revokeReason.trim());
        setNotification(`Work item #${shortenAddress(id)} marked REVOKED on Monad Testnet.`);
        await refetchQueue();
      } else {
        const isLive = trustGraphService.getMode() === 'LIVE' && Boolean(address);
        await revoke(id, revokeReason.trim(), { isLiveOnChain: isLive });
        setNotification(
          isLive
            ? `Attestation #${id} revoked on Monad Testnet — receipt confirmed. Historical record preserved on-chain.`
            : `Attestation #${id} marked REVOKED in local sandbox. Historical record preserved.`
        );
      }
      setIsModalOpen(false);
      setSelectedAttestation(null);
      setRevokeReason('');
      refetchAttestations();
      refetchProfile();
    } catch {
      // Surfaced via error display
    } finally {
      setIsRevokingAttestation(false);
    }
  };

  const tabs: Array<{ key: QueueTab; label: string; count: number }> = [
    { key: 'SUBMISSIONS', label: 'DEVELOPER SUBMISSIONS', count: pendingSubmissionsCount },
    { key: 'ALL', label: 'ALL ATTESTATIONS', count: attestationsList.length },
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
              Reviewer Verification Management
            </h1>
            <p className="text-xs text-ink-muted mt-2 max-w-2xl leading-relaxed">
              Triage submitted developer claims, inspect evidence manifests, and anchor on-chain proofs on Monad.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Link
              to="/submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-surface-raised border border-surface-border text-ink-muted hover:text-ink font-medium text-xs rounded-sm transition-colors"
            >
              <FileCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Submit Work</span>
            </Link>
            <Link
              to="/issue"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-bright text-white font-semibold text-xs rounded-sm transition-colors"
            >
              <span>+ Issue Attestation</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>

        {/* ─── Access Control Advisory ────────────────────────── */}
        {address && !isVerifier && !isVerifierLoading && !verifierError && (
          <motion.div variants={fadeRise} className="mb-6">
            <div role="status" className="p-4 bg-status-pending/10 border border-status-pending/40 text-xs text-status-pending flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                Connected wallet ({shortenAddress(address)}) is not an authorized verifier. Reviewer privileges are required to verify or reject claims on Monad Testnet.
              </span>
            </div>
          </motion.div>
        )}

        {!isDemoMode && (queueError || verifierError) && (
          <motion.div variants={fadeRise} className="mb-6">
            <div role="alert" className="p-4 bg-status-revoked/10 border border-status-revoked/40 text-xs text-status-revoked flex items-center justify-between gap-4">
              <span>
                Could not read verifier authorization or work queue from the configured ProofOfWorkRegistry.{' '}
                {queueError instanceof Error ? queueError.message : verifierError instanceof Error ? verifierError.message : 'Retry the registry read.'}
              </span>
              <button
                type="button"
                onClick={() => { void refetchQueue(); }}
                className="px-3 py-1 bg-surface-raised hover:bg-surface-border text-ink border border-surface-border font-mono text-xs transition-colors shrink-0"
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

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
                  type="button"
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
            hint="Switch between developer submissions and recorded attestations"
            className="mb-4"
          />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter submissions and attestations">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3 py-1.5 border font-mono text-xs transition-colors flex items-center gap-2',
                  activeTab === tab.key
                    ? 'bg-surface-raised border-primary/50 text-ink'
                    : 'bg-transparent border-surface-border text-ink-dim hover:text-ink hover:border-surface-border-strong'
                )}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-70 px-1 py-0.2 bg-surface-subtle border border-surface-border rounded-sm">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ─── Queue Content ─────────────────────────────────── */}
        <motion.div variants={fadeRise}>
          {activeTab === 'SUBMISSIONS' ? (
            <div>
              <SectionHeader
                index="02"
                title="Developer Submissions Queue"
                hint={isQueueLoading ? 'Fetching from registry…' : `${submissions.length} submission${submissions.length === 1 ? '' : 's'} recorded`}
                className="mb-4"
              />

              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <Panel className="p-10 text-center">
                    <p className="font-mono text-xs text-ink-dim mb-4">
                      No developer work submissions found. Developers can submit work at /submit.
                    </p>
                    <Link
                      to="/submit"
                      className="px-3.5 py-1.5 bg-primary hover:bg-primary-bright text-white font-medium text-xs transition-colors inline-block"
                    >
                      Submit Work Claim
                    </Link>
                  </Panel>
                ) : (
                  submissions.map((sub) => {
                    const claimType = getClaimTypeDetails(sub.claimType);
                    const isPending = sub.status === 'PENDING';
                    const isApproved = sub.status === 'APPROVED';
                    const isRejected = sub.status === 'REJECTED';
                    const isItemApproving = approvingId === sub.id || (isVerifyingOnChain && approvingId === sub.id);

                    return (
                      <Panel as="article" key={sub.id} interactive className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
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
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 border font-mono text-[10px] uppercase tracking-widest',
                                  isPending && 'text-status-pending border-status-pending/40 bg-status-pending/[0.07]',
                                  isApproved && 'text-status-verified border-status-verified/40 bg-status-verified/[0.07]',
                                  isRejected && 'text-status-revoked border-status-revoked/40 bg-status-revoked/[0.07]'
                                )}
                              >
                                {sub.status}
                              </span>
                              <span className="font-mono text-xs text-ink-dim truncate max-w-[200px]">
                                ID: {sub.id}
                              </span>
                            </div>

                            <h3 className="text-sm font-semibold text-ink">{sub.title}</h3>
                            <p className="text-xs text-ink-muted leading-relaxed max-w-3xl">
                              {sub.description}
                            </p>

                            <div className="text-xs text-ink-muted font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>
                                Developer:{' '}
                                <Link to={`/passport/${sub.worker}`} className="text-ink hover:underline">
                                  {shortenAddress(sub.worker)}
                                </Link>
                              </span>
                              <span>Submitted: {formatDateTime(sub.submittedAt)}</span>
                              {sub.evidenceUrl && (
                                <a
                                  href={sub.evidenceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:text-primary-bright inline-flex items-center gap-1 underline"
                                >
                                  <span>Evidence URL</span>
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>

                            <div className="text-[11px] font-mono text-ink-dim bg-surface-subtle p-2 border border-surface-border break-all">
                              SHA-256 Digest: <span className="text-ink">{sub.evidenceHash}</span>
                            </div>

                            {isRejected && sub.rejectionReason && (
                              <p className="text-[11px] text-status-revoked/90 font-mono leading-relaxed bg-status-revoked/5 p-2 border border-status-revoked/30">
                                Rejection Reason: “{sub.rejectionReason}”
                              </p>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={isItemApproving}
                                  onClick={() => handleApproveSubmission(sub)}
                                  className="px-3.5 py-1.5 bg-status-verified hover:bg-status-verified/80 disabled:opacity-50 text-background font-semibold text-xs transition-colors flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{isItemApproving ? 'Confirming…' : 'Approve & Verify'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubmissionToReject(sub);
                                    setRejectReason('');
                                    setRejectError(null);
                                  }}
                                  className="px-3 py-1.5 bg-surface-raised hover:bg-status-revoked/10 hover:text-status-revoked hover:border-status-revoked/40 border border-surface-border text-ink-muted text-xs font-mono transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <Link
                                to={`/verify/${sub.id}`}
                                className="px-3.5 py-1.5 bg-surface-raised hover:bg-surface-border text-ink border border-surface-border font-mono text-xs transition-colors flex items-center gap-1.5"
                              >
                                <span>Audit Proof</span>
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </Panel>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              <SectionHeader
                index="02"
                title="Attestation Queue"
                hint={isAttestationsLoading ? 'Fetching from registry…' : `${displayedAttestations.length} record${displayedAttestations.length === 1 ? '' : 's'} in view`}
                className="mb-4"
              />

              <div className="space-y-3">
                {displayedAttestations.map((att) => {
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

                {!isAttestationsLoading && displayedAttestations.length === 0 && (
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
            </div>
          )}
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
                  Revocation is recorded on-chain or in local sandbox. The historical record is preserved with status <code className="font-mono text-status-revoked">REVOKED</code> and a cause.
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
                      {revokeTxStep === 'submitted'
                        ? (trustGraphService.getMode() === 'LIVE' ? 'Broadcasting to Monad…' : 'Recording local fixture…')
                        : revokeTxStep === 'confirmed'
                          ? (trustGraphService.getMode() === 'LIVE' ? 'Revoked on Monad (10143)' : 'Recorded (local sandbox)')
                          : REVOKE_TX_LABELS[revokeTxStep]}
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
                      disabled={revokePending || isRevokingAttestation || !revokeReason.trim()}
                      className="px-4 py-2 bg-status-revoked hover:bg-status-revoked/80 disabled:opacity-40 text-background font-semibold text-xs transition-colors"
                    >
                      {revokeTxStep === 'waiting-wallet' ? 'Sign in Wallet…' : isRevokingAttestation ? 'Confirming…' : 'Confirm Revocation'}
                    </button>
                  </div>
                </form>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Reject Submission Modal ─────────────────────────── */}
      <AnimatePresence>
        {selectedSubmissionToReject && (
          <motion.div
            key="reject-overlay"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { if (!isRejecting) setSelectedSubmissionToReject(null); }}
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.99 }}
              transition={settleTransition}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reject-modal-title"
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Panel className="p-6 bg-surface-raised">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 id="reject-modal-title" className="text-base font-bold text-ink">
                    Reject Submission: {selectedSubmissionToReject.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionToReject(null)}
                    disabled={isRejecting}
                    aria-label="Close rejection dialog"
                    className="text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs text-ink-muted leading-relaxed mb-4">
                  Record a formal rationale for declining this submission. The developer will see this status in their passport and review dashboard.
                </p>

                {rejectError && (
                  <div role="alert" className="mb-4 p-3 bg-status-revoked/10 border border-status-revoked/40 text-xs text-status-revoked font-mono">
                    {rejectError}
                  </div>
                )}

                <form onSubmit={handleRejectSubmissionSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="reject-reason-modal" className="block font-mono text-[10px] uppercase tracking-widest-xl text-status-revoked mb-1.5">
                      Rejection Rationale *
                    </label>
                    <textarea
                      id="reject-reason-modal"
                      required
                      rows={3}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g. Contract bytecode not found on explorer; test coverage insufficient; PR not merged…"
                      className="w-full bg-surface-subtle border border-surface-border p-2.5 text-xs text-ink placeholder-ink-dim font-mono focus:outline-none focus:border-status-revoked/60 focus:ring-1 focus:ring-status-revoked/30 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionToReject(null)}
                      disabled={isRejecting}
                      className="px-3 py-2 text-xs text-ink-muted hover:text-ink disabled:opacity-40 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isRejecting || isRejectingOnChain || !rejectReason.trim()}
                      className="px-4 py-2 bg-status-revoked hover:bg-status-revoked/80 disabled:opacity-40 text-background font-semibold text-xs transition-colors"
                    >
                      {isRejecting || isRejectingOnChain ? 'Rejecting…' : 'Reject Submission'}
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
