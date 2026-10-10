import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Clock,
  FileCheck,
  Ban,
  UserCheck,
  Hash,
  Share2,
  Calendar
} from 'lucide-react';
import { useAttestation, useRevokeAttestation, useIssuerStatus } from '../hooks/useTrustGraph';
import { 
  shortenAddress, 
  shortenHash, 
  formatDate, 
  formatDateTime, 
  getClaimTypeDetails, 
  getValidityDetails, 
  computeSha256 
} from '../utils/formatters';
import { 
  TRUST_GRAPH_REGISTRY_ADDRESS, 
  getExplorerAddressUrl, 
  getExplorerTxUrl 
} from '../lib/contract/config';
import { trustGraphService } from '../services/trustGraphService';

export const VerificationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const activeId = id || '1';
  const { attestation, isLoading, error, refetch } = useAttestation(activeId);
  const { address } = useAccount();
  const { revoke, txStep: revokeTxStep } = useRevokeAttestation();

  // Local verification test state
  const [testContent, setTestContent] = useState('');
  const [hashResult, setHashResult] = useState<{
    tested: boolean;
    matches: boolean;
    computedHash: string;
  } | null>(null);

  // Revocation modal state
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeSuccessMsg, setRevokeSuccessMsg] = useState<string | null>(null);

  const [copiedHash, setCopiedHash] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleTestHash = async () => {
    if (!testContent.trim() || !attestation) return;
    const computed = await computeSha256(testContent);
    const matches = computed.toLowerCase() === attestation.evidenceHash.toLowerCase();
    setHashResult({
      tested: true,
      matches,
      computedHash: computed,
    });
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

    try {
      await revoke(attestation.id, revokeReason.trim());
      setIsRevoking(false);
      setRevokeSuccessMsg('Attestation has been revoked on Monad. Historical record updated.');
      refetch();
    } catch (err: any) {
      alert(`Revocation failed: ${err?.message || 'Error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block h-6 w-6 border-2 border-neutral-600 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-400 text-sm font-mono">Fetching attestation #{activeId} from Monad registry...</p>
      </div>
    );
  }

  if (error || !attestation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800">
          <AlertTriangle className="h-8 w-8 text-neutral-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Attestation Not Found</h2>
          <p className="text-neutral-400 text-sm mb-6">
            No attestation found with ID #{activeId} on the registry.
          </p>
          <Link
            to="/verify/1"
            className="px-4 py-2 bg-neutral-100 text-neutral-950 font-medium text-xs rounded-lg hover:bg-white transition-colors"
          >
            Inspect Sample Attestation #1
          </Link>
        </div>
      </div>
    );
  }

  const claimType = getClaimTypeDetails(attestation.claimType);
  const validity = getValidityDetails(attestation.validity);

  const canRevoke =
    !attestation.revoked &&
    address &&
    (address.toLowerCase() === attestation.issuer.toLowerCase() ||
      trustGraphService.isIssuerAuthorized(address));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to={`/profile/${attestation.subject}`}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors font-mono"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Subject Profile</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-mono px-3 py-1 rounded-md border ${claimType.tagBg}`}>
              {claimType.label}
            </span>
            <span className={`text-xs font-mono px-3 py-1 rounded-md border flex items-center gap-1.5 ${validity.badgeClass}`}>
              <span>{validity.symbol}</span>
              <span>{validity.label}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400">
            <Link
              to={`/graph/${attestation.subject}`}
              className="hover:text-white flex items-center gap-1"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Inspect in Graph</span>
            </Link>
            <span className="text-neutral-600">•</span>
            <span>Record ID: #{attestation.id}</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
          {attestation.claimTitle}
        </h1>
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-3xl mb-4">
          {attestation.claimDescription}
        </p>

        {/* Revocation Warning if Revoked */}
        {attestation.revoked && (
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/80 text-xs text-rose-200 mb-4">
            <div className="flex items-center gap-2 font-semibold mb-1 text-rose-300">
              <Ban className="h-4 w-4" />
              <span>Historical Attestation Revoked</span>
            </div>
            <p className="leading-relaxed">
              Reason: &quot;{attestation.revocationReason || 'Revoked by authorized reviewer.'}&quot;
            </p>
          </div>
        )}

        {revokeSuccessMsg && (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{revokeSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* The 7 Core Verification Answers */}
      <div className="space-y-6 mb-10">
        <div className="text-xs font-mono uppercase tracking-wider text-neutral-400">
          Independent Verification Matrix
        </div>

        {/* 1 & 2: Issuer & Authorization Standing */}
        <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono text-neutral-400">01 & 02. REVIEWING AUTHORITY</div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              attestation.issuerAuthorized
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border-rose-800'
            }`}>
              {attestation.issuerAuthorized ? 'AUTHORIZED ISSUER' : 'UNAUTHORIZED / REVOKED'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <div className="text-neutral-500 mb-1">Who verified this claim?</div>
              <div className="text-neutral-200 font-semibold">
                {attestation.issuerName || 'Authorized Ecosystem Reviewer'}
              </div>
              <div className="text-neutral-400 text-[11px] truncate mt-0.5">
                {attestation.issuer}
              </div>
            </div>

            <div>
              <div className="text-neutral-500 mb-1">Registry Authorization:</div>
              <div className="text-neutral-300">
                {attestation.issuerAuthorized ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approved in TrustGraphRegistry.sol</span>
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Issuer privilege revoked from registry</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3 & 4: Evidence Manifest & Cryptographic Hash */}
        <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-4">
          <div className="text-xs font-mono text-neutral-400">03 & 04. EVIDENCE & CRYPTOGRAPHIC ANCHOR</div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-neutral-500 font-mono text-[11px] mb-1">Off-Chain Evidence Source:</div>
              <a
                href={attestation.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 font-mono text-xs underline decoration-emerald-500/40 break-all"
              >
                <span>{attestation.evidenceUrl}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            </div>

            {attestation.evidenceManifest && (
              <div>
                <div className="text-neutral-500 font-mono text-[11px] mb-1">Canonical Evidence Manifest:</div>
                <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {attestation.evidenceManifest}
                </pre>
              </div>
            )}

            <div>
              <div className="text-neutral-500 font-mono text-[11px] mb-1">On-Chain SHA-256 Digest:</div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200">
                <span className="break-all text-emerald-400/90">{attestation.evidenceHash}</span>
                <button
                  onClick={() => copyToClipboard(attestation.evidenceHash)}
                  className="ml-2 p-1 text-neutral-400 hover:text-white shrink-0"
                  title="Copy Hash"
                >
                  {copiedHash ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Client-Side Cryptographic Verifier Widget */}
          <div className="mt-4 pt-4 border-t border-neutral-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-neutral-300 font-semibold flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Client-Side SHA-256 Verifier Tool</span>
              </span>
              <button
                onClick={handlePreloadManifest}
                className="text-[11px] font-mono text-neutral-400 hover:text-white underline"
              >
                Pre-load Recorded Manifest
              </button>
            </div>

            <textarea
              rows={3}
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              placeholder="Paste or modify evidence text to test if SHA-256 hash matches the blockchain anchor..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 font-mono focus:border-neutral-600 focus:outline-none mb-2"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestHash}
                disabled={!testContent.trim()}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 font-mono text-xs rounded transition-colors"
              >
                Compute & Compare Hash
              </button>

              {hashResult && hashResult.tested && (
                <div className={`text-xs font-mono flex items-center gap-1.5 ${
                  hashResult.matches ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {hashResult.matches ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>MATCH: Evidence text matches on-chain hash exactly!</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>MISMATCH: Computed hash does not match on-chain record.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5, 6 & 7: Timestamps, Expiry, and Monad Transaction Record */}
        <div className="p-5 rounded-xl bg-neutral-900/40 border border-neutral-800 space-y-4">
          <div className="text-xs font-mono text-neutral-400">05, 06 & 07. LIFECYCLE & MONAD TRANSACTION</div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <div className="text-neutral-500 mb-1">Issued Date:</div>
              <div className="text-neutral-200">{formatDateTime(attestation.issuedAt)}</div>
            </div>

            <div>
              <div className="text-neutral-500 mb-1">Expiration Status:</div>
              <div className="text-neutral-200">
                {attestation.expiry === 0 ? (
                  <span className="text-emerald-400">Perpetual (No Expiry)</span>
                ) : (
                  <span>Expires {formatDate(attestation.expiry)}</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-neutral-500 mb-1">Revocation Status:</div>
              <div>
                {attestation.revoked ? (
                  <span className="text-rose-400">Revoked</span>
                ) : (
                  <span className="text-emerald-400">Standing (Active)</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800/80 text-xs font-mono space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-neutral-500">Monad Transaction Hash:</span>
              {attestation.transactionHash ? (
                <a
                  href={getExplorerTxUrl(attestation.transactionHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline flex items-center gap-1.5"
                >
                  <span>{attestation.transactionHash}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-neutral-500">Simulated in Local Sandbox Mode</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-neutral-500">Registry Contract:</span>
              <a
                href={getExplorerAddressUrl(TRUST_GRAPH_REGISTRY_ADDRESS)}
                target="_blank"
                rel="noreferrer"
                className="text-neutral-300 hover:text-white flex items-center gap-1"
              >
                <span>{shortenAddress(TRUST_GRAPH_REGISTRY_ADDRESS, 8)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

      </div>

      {/* Verifier Action: Revoke Attestation */}
      {canRevoke && (
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Reviewer Management Action</h3>
              <p className="text-xs text-neutral-400">
                You are connected as an authorized reviewer with privileges to revoke this attestation.
              </p>
            </div>
            {!isRevoking && (
              <button
                onClick={() => setIsRevoking(true)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-mono transition-colors"
              >
                Revoke Attestation
              </button>
            )}
          </div>

          {isRevoking && (
            <form onSubmit={handleRevokeSubmit} className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
              <div className="text-xs font-semibold text-rose-300">
                Provide Human-Readable Revocation Rationale *
              </div>
              <textarea
                required
                rows={2}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Audit revealed security issue; evidence URL invalid; work deprecated..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:border-rose-600 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={revokeTxStep === 'submitted' || revokeTxStep === 'waiting-wallet'}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  {revokeTxStep === 'waiting-wallet' ? 'Sign in Wallet...' : 'Confirm Revocation'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRevoking(false)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

    </div>
  );
};

export const ProofDetailPage = VerificationDetailPage;
