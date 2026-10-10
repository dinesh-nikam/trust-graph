import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  UserCheck, 
  CheckCircle2, 
  ArrowRight,
  Clock,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  X,
  XCircle
} from 'lucide-react';
import { useAllAttestations, useRegistryOwner, useRevokeAttestation } from '../hooks/useTrustGraph';
import { 
  useVerifierQueue, 
  useVerifyWork, 
  useRejectWork, 
  useRevokeWork, 
  useVerifierStatus,
  OnChainWork,
} from '../hooks/useWorkRegistry';
import { 
  shortenAddress, 
  formatDate, 
  formatDateTime,
  getClaimTypeDetails, 
  getValidityDetails 
} from '../utils/formatters';
import { Attestation, WorkSubmission } from '../types';
import { trustGraphService } from '../services/trustGraphService';
import { PROOF_OF_WORK_REGISTRY_CONFIGURED, getExplorerTxUrl } from '../lib/contract/config';

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: attestations = [], isLoading: isAttestationsLoading, error, refetch } = useAllAttestations();
  const { address } = useAccount();
  const { owner } = useRegistryOwner();
  const { revoke: revokeLegacy } = useRevokeAttestation();

  // On-chain Work Registry Hooks
  const { isVerifier, isLoading: isVerifierLoading, error: verifierError } = useVerifierStatus(address);
  const { 
    pendingWorks: onChainPending, 
    verifiedWorks: onChainVerified, 
    rejectedWorks: onChainRejected, 
    revokedWorks: onChainRevoked, 
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue 
  } = useVerifierQueue();
  const { verify: verifyWorkOnChain, isConfirming: isVerifying } = useVerifyWork();
  const { reject: rejectWorkOnChain, isConfirming: isRejecting } = useRejectWork();
  const { revoke: revokeWorkOnChain, isConfirming: isRevokingWork } = useRevokeWork();

  const [activeTab, setActiveTab] = useState<'SUBMISSIONS' | 'ALL' | 'VALID' | 'REVOKED'>('SUBMISSIONS');
  
  // Attestation Revocation State
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Submissions State
  const isDemoMode = trustGraphService.getMode() === 'DEMO';
  const [localSubmissions, setLocalSubmissions] = useState<WorkSubmission[]>(() =>
    isDemoMode ? trustGraphService.getSubmissions() : []
  );
  const [selectedSubmissionToReject, setSelectedSubmissionToReject] = useState<WorkSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Action in progress state
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Global UI Notification
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageUpdate = () => {
      setLocalSubmissions(trustGraphService.getMode() === 'DEMO' ? trustGraphService.getSubmissions() : []);
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  // Merge on-chain pending items with local submissions (avoiding duplicate IDs)
  const combinedPending: WorkSubmission[] = [
    ...onChainPending.map((ow): WorkSubmission => ({
      id: ow.workId,
      worker: ow.worker,
      claimType: ow.workType === 'SMART_CONTRACT' ? 'CONTRACT_DEPLOYED' : ow.workType === 'GITHUB_CONTRIBUTION' ? 'CONTRIBUTION_VERIFIED' : 'CHALLENGE_COMPLETED',
      title: ow.title || `${ow.workType} (On-chain)`,
      description: ow.description || `Proof of work registered on Monad Testnet with evidence hash ${ow.evidenceHash}`,
      evidenceUrl: ow.metadataUri,
      evidenceManifest: `Evidence URI: ${ow.metadataUri}\nHash: ${ow.evidenceHash}`,
      evidenceHash: ow.evidenceHash,
      submittedAt: ow.createdAt,
      status: 'PENDING',
    })),
    ...(isDemoMode ? localSubmissions : []).filter(
      (ls) => !onChainPending.some((ow) => ow.workId.toLowerCase() === ls.id.toLowerCase())
    ),
  ];

  const pendingSubmissionsCount = combinedPending.filter((s) => s.status === 'PENDING').length;

  // Merge on-chain verified/revoked works into attestations list if not already present
  const allAttestationsCombined: Attestation[] = [
    ...attestations,
    ...onChainVerified
      .filter((ow) => !attestations.some((a) => a.id.toLowerCase() === ow.workId.toLowerCase()))
      .map((ow): Attestation => ({
        id: ow.workId,
        issuer: ow.verifier,
        issuerName: shortenAddress(ow.verifier),
        issuerRole: 'Authorized Verifier',
        issuerAuthorized: true,
        subject: ow.worker,
        claimType: ow.workType === 'SMART_CONTRACT' ? 'CONTRACT_DEPLOYED' : ow.workType === 'GITHUB_CONTRIBUTION' ? 'CONTRIBUTION_VERIFIED' : 'CHALLENGE_COMPLETED',
        claimTitle: ow.title || `${ow.workType} Proof`,
        claimDescription: ow.description || `Proof of work recorded on Monad Testnet with evidence digest ${ow.evidenceHash}`,
        evidenceHash: ow.evidenceHash,
        evidenceUrl: ow.metadataUri,
        evidenceManifest: `Evidence URI: ${ow.metadataUri}\nHash: ${ow.evidenceHash}`,
        issuedAt: ow.verifiedAt || ow.createdAt,
        expiry: 0,
        revoked: false,
        validity: 'VALID',
        validityExplanation: 'Verified on-chain by authorized verifier on Monad Testnet.',
        isLiveOnChain: true,
      })),
    ...onChainRevoked
      .filter((ow) => !attestations.some((a) => a.id.toLowerCase() === ow.workId.toLowerCase()))
      .map((ow): Attestation => ({
        id: ow.workId,
        issuer: ow.verifier,
        issuerName: shortenAddress(ow.verifier),
        issuerRole: 'Authorized Verifier',
        issuerAuthorized: true,
        subject: ow.worker,
        claimType: ow.workType === 'SMART_CONTRACT' ? 'CONTRACT_DEPLOYED' : ow.workType === 'GITHUB_CONTRIBUTION' ? 'CONTRIBUTION_VERIFIED' : 'CHALLENGE_COMPLETED',
        claimTitle: ow.title || `${ow.workType} Proof`,
        claimDescription: ow.description || `Proof of work recorded on Monad Testnet with evidence digest ${ow.evidenceHash}`,
        evidenceHash: ow.evidenceHash,
        evidenceUrl: ow.metadataUri,
        evidenceManifest: `Evidence URI: ${ow.metadataUri}\nHash: ${ow.evidenceHash}`,
        issuedAt: ow.verifiedAt || ow.createdAt,
        expiry: 0,
        revoked: true,
        revocationReason: ow.statusReason,
        validity: 'REVOKED',
        validityExplanation: `Revoked: ${ow.statusReason || 'Revocation recorded on Monad.'}`,
        isLiveOnChain: true,
      })),
  ];

  const displayedAttestations = allAttestationsCombined.filter((a) => {
    if (activeTab === 'VALID') return a.validity === 'VALID';
    if (activeTab === 'REVOKED') return a.validity === 'REVOKED';
    return true;
  });

  const handleApproveSubmission = async (sub: WorkSubmission) => {
    setApprovingId(sub.id);
    setNotification(null);
    try {
      if (sub.id.startsWith('0x') && sub.id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        await verifyWorkOnChain(sub.id as `0x${string}`);
        setNotification(`Work item ${shortenAddress(sub.id)} approved and confirmed VERIFIED on Monad Testnet.`);
        await Promise.all([refetchQueue(), refetch()]);
      } else {
        if (!isDemoMode) throw new Error('Live verification requires a registered on-chain work item.');
        await trustGraphService.approveSubmission(sub.id, `att-${Date.now()}`);
        setNotification(`Submission "${sub.title}" marked APPROVED in Reviewer Portal.`);
        setLocalSubmissions(trustGraphService.getSubmissions());
      }
    } catch (err: unknown) {
      setNotification(`Verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttestation || !revokeReason.trim()) return;

    setIsRevoking(true);
    setRevokeError(null);
    try {
      if (selectedAttestation.id.startsWith('0x') && selectedAttestation.id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        await revokeWorkOnChain(selectedAttestation.id as `0x${string}`, revokeReason.trim());
        setNotification(`Work item #${shortenAddress(selectedAttestation.id)} marked REVOKED on Monad.`);
        await Promise.all([refetchQueue(), refetch()]);
      } else {
        if (selectedAttestation.id.startsWith('0x')) throw new Error('ProofOfWorkRegistry address is not configured.');
        await revokeLegacy(selectedAttestation.id, revokeReason.trim());
        setNotification(`Attestation #${selectedAttestation.id} marked REVOKED.`);
      }
      setIsRevokeModalOpen(false);
      setSelectedAttestation(null);
      setRevokeReason('');
      await Promise.all([refetchQueue(), refetch()]);
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'Unknown revocation error.');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRejectSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmissionToReject || !rejectReason.trim()) return;

    setRejectError(null);
    try {
      if (selectedSubmissionToReject.id.startsWith('0x') && selectedSubmissionToReject.id.length === 66 && PROOF_OF_WORK_REGISTRY_CONFIGURED && address) {
        await rejectWorkOnChain(selectedSubmissionToReject.id as `0x${string}`, rejectReason.trim());
        setNotification(`Work item "${selectedSubmissionToReject.title}" rejected on Monad.`);
        await Promise.all([refetchQueue(), refetch()]);
      } else {
        if (!isDemoMode) throw new Error('Live rejection requires a registered on-chain work item.');
        await trustGraphService.rejectSubmission(selectedSubmissionToReject.id, rejectReason.trim());
        setNotification(`Submission "${selectedSubmissionToReject.title}" rejected.`);
        setLocalSubmissions(trustGraphService.getSubmissions());
      }
      setSelectedSubmissionToReject(null);
      setRejectReason('');
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Failed to reject submission.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 mb-3">
            <UserCheck className="h-3.5 w-3.5 text-neutral-300" />
            <span>Authorized Attestation & Triage Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Reviewer Verification Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2">
            Triage submitted developer claims, inspect evidence manifests, and anchor on-chain proofs on Monad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/submit"
            className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-medium text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <FileCheck className="h-3.5 w-3.5" />
            <span>Submit Work</span>
          </Link>
          <Link
            to="/issue"
            className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <span>+ Direct Issuance</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Access Control Advisory */}
      {address && !isVerifier && !isVerifierLoading && !verifierError && (
        <div role="status" className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            Connected wallet ({shortenAddress(address)}) is not an authorized verifier. Reviewer privileges are required to verify or reject claims on Monad Testnet.
          </span>
        </div>
      )}

      {!isDemoMode && (queueError || verifierError) && (
        <div role="alert" className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-200 flex items-center justify-between gap-4">
          <span>Could not read verifier authorization or work queue from the configured ProofOfWorkRegistry. {queueError instanceof Error ? queueError.message : verifierError instanceof Error ? verifierError.message : 'Retry the registry read.'}</span>
          <button onClick={() => { void refetchQueue(); }} className="px-3 py-1.5 rounded border border-rose-700 hover:bg-rose-900/40">Retry</button>
        </div>
      )}

      {notification && (
        <div role="status" className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white" aria-label="Close notification">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('SUBMISSIONS')}
          className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-2 ${
            activeTab === 'SUBMISSIONS'
              ? 'bg-neutral-800 text-white font-medium'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <span>DEVELOPER SUBMISSIONS</span>
          {pendingSubmissionsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] rounded-full">
              {pendingSubmissionsCount}
            </span>
          )}
        </button>

        {(['ALL', 'VALID', 'REVOKED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
              activeTab === tab
                ? 'bg-neutral-800 text-white font-medium'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'ALL' ? 'ALL ON-CHAIN ATTESTATIONS' : tab}
          </button>
        ))}
      </div>

      {/* SUBMISSIONS TAB CONTENT */}
      {activeTab === 'SUBMISSIONS' && (
        <div className="space-y-4">
          {combinedPending.length === 0 ? (
            <div className="p-8 rounded-xl bg-neutral-900/40 border border-neutral-800 text-center text-xs text-neutral-400">
              No developer work submissions found. Developers can submit work at{' '}
              <Link to="/submit" className="text-emerald-400 hover:underline">/submit</Link>.
            </div>
          ) : (
            combinedPending.map((sub) => {
              const claimType = getClaimTypeDetails(sub.claimType);
              const isPending = sub.status === 'PENDING';
              const isApproved = sub.status === 'APPROVED';
              const isRejected = sub.status === 'REJECTED';
              const isItemApproving = approvingId === sub.id;

              return (
                <div
                  key={sub.id}
                  className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${claimType.tagBg}`}>
                        {claimType.label}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          isPending
                            ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                            : isApproved
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950/60 text-rose-300 border-rose-800'
                        }`}
                      >
                        {sub.status}
                      </span>
                      <span className="text-neutral-500 font-mono text-xs truncate max-w-[200px]">ID: {sub.id}</span>
                    </div>

                    <h3 className="text-sm font-semibold text-white">{sub.title}</h3>
                    <p className="text-xs text-neutral-300 leading-relaxed max-w-3xl">
                      {sub.description}
                    </p>

                    <div className="text-xs text-neutral-400 font-mono flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                      <span>Developer: <Link to={`/passport/${sub.worker}`} className="text-neutral-300 hover:underline">{shortenAddress(sub.worker)}</Link></span>
                      <span>Submitted: {formatDateTime(sub.submittedAt)}</span>
                      {sub.evidenceUrl && (
                        <a
                          href={sub.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-300 hover:text-white inline-flex items-center gap-1 underline"
                        >
                          <span>Evidence URL</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <div className="text-[11px] font-mono text-neutral-500 bg-neutral-950/80 p-2 rounded border border-neutral-800/80 break-all">
                      SHA-256: <span className="text-neutral-300">{sub.evidenceHash}</span>
                    </div>

                    {isRejected && sub.rejectionReason && (
                      <div className="text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded border border-rose-900/60">
                        <strong>Rejection Reason:</strong> {sub.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 pt-2 sm:pt-0">
                    {isPending && (
                      <>
                        <button
                          disabled={isItemApproving}
                          onClick={() => handleApproveSubmission(sub)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{isItemApproving ? 'Confirming...' : 'Approve & Verify'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedSubmissionToReject(sub);
                            setRejectReason('');
                            setRejectError(null);
                          }}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 border border-neutral-700 text-neutral-300 text-xs font-mono rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <Link
                        to={`/proof/${sub.id}`}
                        className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <span>Audit Proof</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ON-CHAIN ATTESTATIONS TAB CONTENT */}
      {activeTab !== 'SUBMISSIONS' && (
        <div className="space-y-4">
          {isAttestationsLoading && <p className="text-sm text-neutral-400 mb-6">Loading attestation records from Monad Testnet...</p>}
          {error && (
            <div role="status" className="text-xs text-amber-300 mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800 flex items-center justify-between gap-4">
              <span>ProofOfWorkRegistry is active on Monad Testnet; Attestation Registry is pending deployment.</span>
              <button onClick={() => refetch()} className="px-3 py-1 rounded border border-amber-700 hover:bg-amber-900/40 font-mono">Retry Read</button>
            </div>
          )}
          {!isAttestationsLoading && !error && displayedAttestations.length === 0 && (
            <p className="text-sm text-neutral-400 mb-6">No attestations match this filter.</p>
          )}

          {displayedAttestations.map((att) => {
            const claimType = getClaimTypeDetails(att.claimType);
            const validity = getValidityDetails(att.validity);

            return (
              <div
                key={att.id}
                className="p-5 rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${claimType.tagBg}`}>
                      {claimType.label}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${validity.badgeClass}`}>
                      {validity.label}
                    </span>
                    <span className="text-neutral-500 font-mono text-xs">#{att.id}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">{att.claimTitle}</h3>
                  <div className="text-xs text-neutral-400 font-mono flex items-center gap-4">
                    <span>Subject: {shortenAddress(att.subject)}</span>
                    <span>Issued: {formatDate(att.issuedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/verify/${att.id}`}
                    className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-white transition-colors"
                  >
                    Audit Details
                  </Link>

                  {!att.revoked && address && (address.toLowerCase() === att.issuer.toLowerCase() || address.toLowerCase() === owner?.toLowerCase()) && (
                    <button
                      onClick={() => {
                        setSelectedAttestation(att);
                        setIsRevokeModalOpen(true);
                        setRevokeError(null);
                      }}
                      className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-mono transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revocation Modal */}
      {isRevokeModalOpen && selectedAttestation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-base font-bold text-white mb-2">Revoke Attestation #{selectedAttestation.id}</h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Revocation is recorded on Monad. The historical record will be preserved with status <code>REVOKED</code>.
            </p>

            {revokeError && (
              <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {revokeError}
              </div>
            )}

            <form onSubmit={handleRevokeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Reason for Revocation *
                </label>
                <textarea
                  required
                  rows={3}
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Audit revealed security issue; evidence invalidated..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isRevoking}
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevoking || !revokeReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isRevoking ? 'Confirming...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Submission Modal */}
      {selectedSubmissionToReject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-base font-bold text-white mb-2">
              Reject Submission: {selectedSubmissionToReject.title}
            </h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Record a rationale for declining this submission. The developer will see this status in their dashboard.
            </p>

            {rejectError && (
              <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
                {rejectError}
              </div>
            )}

            <form onSubmit={handleRejectSubmissionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Rejection Rationale *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Contract bytecode not found at address; GitHub PR was not merged..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSubmissionToReject(null)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Reject Submission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VerifyPage;
