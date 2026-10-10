import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  GitGraph, 
  ExternalLink, 
  Copy, 
  Check, 
  ArrowRight,
  Share2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Clock,
  Ban,
  Filter
} from 'lucide-react';
import { useTrustProfile } from '../hooks/useTrustGraph';
import { ClaimType, ValidityStatus } from '../types';
import { 
  shortenAddress, 
  shortenHash, 
  formatDate, 
  getClaimTypeDetails, 
  getValidityDetails 
} from '../utils/formatters';
import { DEMO_WALLETS, getExplorerAddressUrl, getExplorerTxUrl } from '../lib/contract/config';

export const TrustProfilePage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const activeAddress = address || DEMO_WALLETS.DEVELOPER.address;
  const { profile, isLoading, error } = useTrustProfile(activeAddress);

  const [claimFilter, setClaimFilter] = useState<'ALL' | ClaimType>('ALL');
  const [validityFilter, setValidityFilter] = useState<'ALL' | ValidityStatus>('ALL');
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const copyAddress = () => {
    if (!profile?.address) return;
    navigator.clipboard.writeText(profile.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-block h-6 w-6 border-2 border-neutral-600 border-t-emerald-400 rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-400 text-sm font-mono">Resolving TrustGraph on Monad registry...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-xl bg-neutral-900 border border-neutral-800">
          <AlertCircle className="h-8 w-8 text-neutral-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">Profile Not Found</h2>
          <p className="text-neutral-400 text-sm mb-6">
            No registered attestations found for address {activeAddress}.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
              className="px-4 py-2 bg-white text-neutral-950 font-medium text-xs rounded-lg hover:bg-neutral-200 transition-colors"
            >
              Inspect Sarah&apos;s Demo Profile
            </Link>
            <Link
              to="/issue"
              className="px-4 py-2 bg-neutral-800 text-white font-medium text-xs rounded-lg hover:bg-neutral-700 transition-colors"
            >
              Issue First Attestation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredAttestations = profile.attestations.filter((a) => {
    if (claimFilter !== 'ALL' && a.claimType !== claimFilter) return false;
    if (validityFilter !== 'ALL' && a.validity !== validityFilter) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Top Banner: Public Inspection Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-8 border-b border-neutral-800/80">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span className="font-semibold text-neutral-200">PUBLIC INSPECTION VIEW</span>
          <span className="text-neutral-600">•</span>
          <span>No wallet required to audit evidence & validity</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/graph/${profile.address}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 text-xs font-mono transition-colors"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>View Graph</span>
          </Link>

          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700 text-xs font-mono transition-colors"
          >
            {shareCopied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Share Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        
        {/* Identity Card */}
        <div className="lg:col-span-2 p-6 rounded-xl bg-neutral-900/60 border border-neutral-800">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {profile.alias || 'Developer Profile'}
                </h1>
                <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded">
                  Subject
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xl">
                {profile.bio || 'Developer with evidence-backed attestations anchored on Monad testnet.'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-md border border-neutral-800">
              <span className="text-neutral-500">Subject Wallet:</span>
              <span className="text-neutral-200">{shortenAddress(profile.address, 6)}</span>
              <button
                onClick={copyAddress}
                className="hover:text-white text-neutral-500 transition-colors"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>

            <a
              href={getExplorerAddressUrl(profile.address)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-white text-neutral-400 transition-colors"
            >
              <span>Monad Explorer</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Verification Summary (No arbitrary scores!) */}
        <div className="p-6 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
              On-Chain Status Breakdown
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-emerald-400 mb-0.5">VALID</div>
                <div className="text-2xl font-bold text-white font-mono">{profile.stats.validAttestations}</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-rose-400 mb-0.5">REVOKED</div>
                <div className="text-2xl font-bold text-white font-mono">{profile.stats.revokedAttestations}</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-400 mb-0.5">EXPIRED</div>
                <div className="text-2xl font-bold text-white font-mono">{profile.stats.expiredAttestations}</div>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
                <div className="text-[11px] font-mono text-neutral-500 mb-0.5">TOTAL</div>
                <div className="text-2xl font-bold text-neutral-300 font-mono">{profile.stats.totalAttestations}</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-neutral-500 leading-tight">
            * No numerical trust score. Every claim is supported by inspectable evidence and issuer standing.
          </div>
        </div>

      </div>

      {/* Trusted Issuers Section */}
      <div className="mb-10 p-5 rounded-xl bg-neutral-900/40 border border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Reviewing Authorities for this Subject</span>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            {profile.trustedIssuers.length} Recognized Issuer{profile.trustedIssuers.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profile.trustedIssuers.map((iss) => (
            <div
              key={iss.address}
              className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-start justify-between gap-2"
            >
              <div>
                <div className="text-xs font-semibold text-white">{iss.name}</div>
                <div className="text-[11px] text-neutral-400">{iss.organization}</div>
                <div className="text-[11px] font-mono text-neutral-500 mt-1">
                  {shortenAddress(iss.address)}
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                iss.isAuthorized
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800'
              }`}>
                {iss.isAuthorized ? 'AUTHORIZED' : 'REVOKED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-neutral-800/80">
        {/* Claim Types */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            onClick={() => setClaimFilter('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              claimFilter === 'ALL'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            All Claims ({profile.attestations.length})
          </button>
          <button
            onClick={() => setClaimFilter('CONTRACT_DEPLOYED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              claimFilter === 'CONTRACT_DEPLOYED'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Contract Deployed ({profile.stats.byClaimType.CONTRACT_DEPLOYED})
          </button>
          <button
            onClick={() => setClaimFilter('CHALLENGE_COMPLETED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              claimFilter === 'CHALLENGE_COMPLETED'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Challenge Completed ({profile.stats.byClaimType.CHALLENGE_COMPLETED})
          </button>
          <button
            onClick={() => setClaimFilter('CONTRIBUTION_VERIFIED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              claimFilter === 'CONTRIBUTION_VERIFIED'
                ? 'bg-neutral-800 text-white font-semibold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
            }`}
          >
            Contribution Verified ({profile.stats.byClaimType.CONTRIBUTION_VERIFIED})
          </button>
        </div>

        {/* Validity Filters */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-500 text-[11px] mr-1">Status:</span>
          {(['ALL', 'VALID', 'REVOKED', 'EXPIRED'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setValidityFilter(v)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                validityFilter === v
                  ? 'bg-neutral-800 text-neutral-100 border border-neutral-700'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Attestations Grid / List */}
      {filteredAttestations.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-neutral-900/40 border border-neutral-800">
          <p className="text-neutral-400 text-sm mb-2">No attestations match the selected filter.</p>
          <button
            onClick={() => {
              setClaimFilter('ALL');
              setValidityFilter('ALL');
            }}
            className="text-xs text-emerald-400 hover:underline font-mono"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttestations.map((att) => {
            const claimType = getClaimTypeDetails(att.claimType);
            const validity = getValidityDetails(att.validity);

            return (
              <div
                key={att.id}
                className={`p-6 rounded-xl bg-neutral-900/60 border transition-all ${
                  att.validity === 'REVOKED'
                    ? 'border-rose-900/40 bg-rose-950/10'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border ${claimType.tagBg}`}>
                      {claimType.label}
                    </span>
                    <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border flex items-center gap-1 ${validity.badgeClass}`}>
                      <span>{validity.symbol}</span>
                      <span>{validity.label}</span>
                    </span>
                    <span className="text-neutral-500 font-mono text-xs">#{att.id}</span>
                  </div>

                  <div className="text-xs text-neutral-400 font-mono flex items-center gap-3">
                    <span>Issued: {formatDate(att.issuedAt)}</span>
                    {att.expiry > 0 && (
                      <span className="text-neutral-500">Expires: {formatDate(att.expiry)}</span>
                    )}
                  </div>
                </div>

                {/* Claim title and description */}
                <h3 className="text-base font-semibold text-white mb-2 leading-snug">
                  {att.claimTitle}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed mb-4 max-w-4xl">
                  {att.claimDescription}
                </p>

                {/* Revocation explanation if revoked */}
                {att.revoked && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300">
                    <strong className="font-semibold">Historical Revocation Note:</strong>{' '}
                    {att.revocationReason || 'This proof was previously verified but is no longer valid.'}
                  </div>
                )}

                {/* Metadata & inspection footer */}
                <div className="pt-4 border-t border-neutral-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-neutral-400">
                  {/* Evidence hash & link */}
                  <div>
                    <div className="text-neutral-500 text-[11px] mb-0.5">Evidence Manifest:</div>
                    <div className="flex items-center gap-2">
                      <a
                        href={att.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline decoration-emerald-500/40"
                      >
                        <span>View Evidence</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="text-neutral-500" title={att.evidenceHash}>
                        ({shortenHash(att.evidenceHash, 4)})
                      </span>
                    </div>
                  </div>

                  {/* Reviewer / Issuer */}
                  <div>
                    <div className="text-neutral-500 text-[11px] mb-0.5">Verified By:</div>
                    <div className="text-neutral-200">
                      {att.issuerName || shortenAddress(att.issuer)}
                    </div>
                  </div>

                  {/* Action Link to Full Inspection */}
                  <div className="flex items-center justify-start md:justify-end gap-3 pt-2 md:pt-0">
                    {att.transactionHash && (
                      <a
                        href={getExplorerTxUrl(att.transactionHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-white text-neutral-400 flex items-center gap-1 text-[11px]"
                        title="View transaction on Monad Explorer"
                      >
                        <span>Tx</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    <Link
                      to={`/verify/${att.id}`}
                      className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <span>Audit Proof</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

export const PassportPage = TrustProfilePage;
