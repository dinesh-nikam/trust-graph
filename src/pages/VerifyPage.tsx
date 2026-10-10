import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  UserCheck, 
  CheckCircle2, 
  Ban, 
  ExternalLink, 
  Clock, 
  Check,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useTrustProfile, useRevokeAttestation } from '../hooks/useTrustGraph';
import { 
  shortenAddress, 
  shortenHash, 
  formatDate, 
  getClaimTypeDetails, 
  getValidityDetails 
} from '../utils/formatters';
import { Attestation } from '../types';
import { DEMO_WALLETS, getExplorerTxUrl } from '../lib/contract/config';

export const VerifyPage: React.FC = () => {
  const { profile, isLoading, refetch } = useTrustProfile(DEMO_WALLETS.DEVELOPER.address);
  const { revoke } = useRevokeAttestation();

  const [activeTab, setActiveTab] = useState<'ALL' | 'VALID' | 'REVOKED'>('ALL');
  const [selectedAttestation, setSelectedAttestation] = useState<Attestation | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const attestations = profile?.attestations || [];

  const displayed = attestations.filter((a) => {
    if (activeTab === 'VALID') return a.validity === 'VALID';
    if (activeTab === 'REVOKED') return a.validity === 'REVOKED';
    return true;
  });

  const handleRevokeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttestation || !revokeReason.trim()) return;

    try {
      await revoke(selectedAttestation.id, revokeReason.trim());
      setNotification(`Attestation #${selectedAttestation.id} marked REVOKED.`);
      setIsRevokeModalOpen(false);
      setSelectedAttestation(null);
      setRevokeReason('');
      refetch();
    } catch (err: any) {
      alert(`Error revoking: ${err?.message || 'Error'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 mb-3">
            <UserCheck className="h-3.5 w-3.5 text-neutral-300" />
            <span>Authorized Attestation Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Reviewer Attestation Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2">
            Inspect evidence manifests, verify standing, and manage attestations on Monad testnet.
          </p>
        </div>

        <Link
          to="/issue"
          className="px-4 py-2 bg-neutral-100 hover:bg-white text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
        >
          <span>+ Issue New Attestation</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {notification && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-3 mb-6">
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
            {tab}
          </button>
        ))}
      </div>

      {/* Attestations Table / Grid */}
      <div className="space-y-4">
        {displayed.map((att) => {
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

                {!att.revoked && (
                  <button
                    onClick={() => {
                      setSelectedAttestation(att);
                      setIsRevokeModalOpen(true);
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

      {/* Revocation Modal */}
      {isRevokeModalOpen && selectedAttestation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-white mb-2">Revoke Attestation #{selectedAttestation.id}</h3>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Revocation is recorded on Monad. The historical record will be preserved with status <code>REVOKED</code>.
            </p>

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
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Confirm Revocation
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
