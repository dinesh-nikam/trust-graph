import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Share2,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Eye,
  Fingerprint,
} from 'lucide-react';
import { useTrustProfile } from '../hooks/useTrustGraph';
import { ClaimType, ValidityStatus } from '../types';
import { shortenAddress } from '../utils/formatters';
import { DEMO_WALLETS, getExplorerAddressUrl } from '../lib/contract/config';
import { AttestationCard } from '../components/shared/AttestationCard';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { fadeRise, staggerParent } from '../lib/motion';
import { cn } from '../utils/cn';

const STATUS_TILE_STYLES: Record<string, string> = {
  VALID: 'text-status-verified',
  REVOKED: 'text-status-revoked',
  EXPIRED: 'text-status-expired',
  TOTAL: 'text-ink-muted',
};

const CLAIM_FILTERS: Array<{ key: 'ALL' | ClaimType; label: string }> = [
  { key: 'ALL', label: 'All Claims' },
  { key: 'CONTRACT_DEPLOYED', label: 'Contract Deployed' },
  { key: 'CHALLENGE_COMPLETED', label: 'Challenge Completed' },
  { key: 'CONTRIBUTION_VERIFIED', label: 'Contribution Verified' },
];

export const TrustProfilePage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const activeAddress = address || '';
  const { profile, isLoading, error } = useTrustProfile(activeAddress);
  const shouldReduceMotion = useReducedMotion() ?? false;

  const [claimFilter, setClaimFilter] = useState<'ALL' | ClaimType>('ALL');
  const [validityFilter, setValidityFilter] = useState<'ALL' | ValidityStatus>('ALL');
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const enter = shouldReduceMotion ? false : 'hidden';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <div className="inline-block h-6 w-6 border-2 border-surface-border border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-ink-muted text-sm font-mono">Resolving attestations…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24">
        <Panel className="p-10 text-center">
          <AlertCircle className="h-8 w-8 text-ink-dim mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-ink mb-2">Profile Not Found</h2>
          <p className="text-ink-muted text-sm mb-8 font-mono break-all">
            No registered attestations found for address {activeAddress}.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to={`/profile/${DEMO_WALLETS.DEVELOPER.address}`}
              className="px-4 py-2 bg-primary hover:bg-primary-bright text-white font-medium text-xs transition-colors"
            >
              Inspect Sarah&apos;s Demo Profile
            </Link>
            <Link
              to="/issue"
              className="px-4 py-2 bg-surface-raised border border-surface-border-strong text-ink font-medium text-xs hover:border-primary/50 transition-colors"
            >
              Issue First Attestation
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const filteredAttestations = profile.attestations.filter((a) => {
    if (claimFilter !== 'ALL' && a.claimType !== claimFilter) return false;
    if (validityFilter !== 'ALL' && a.validity !== validityFilter) return false;
    return true;
  });

  const statTiles: Array<{ key: string; label: string; value: number }> = [
    { key: 'VALID', label: 'Valid', value: profile.stats.validAttestations },
    { key: 'REVOKED', label: 'Revoked', value: profile.stats.revokedAttestations },
    { key: 'EXPIRED', label: 'Expired', value: profile.stats.expiredAttestations },
    { key: 'TOTAL', label: 'Total Records', value: profile.stats.totalAttestations },
  ];

  return (
    <div className="animate-page-enter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
      <motion.div
        variants={staggerParent(0.09, 0.05)}
        initial={enter}
        animate="visible"
      >
        {/* ─── Public inspection banner ───────────────────────── */}
        <motion.div
          variants={fadeRise}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-8 border-b border-surface-border"
        >
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-surface-subtle border border-surface-border">
              <Eye className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span className="font-semibold text-ink uppercase tracking-widest text-[11px]">
                Public Inspection View
              </span>
            </span>
            <span className="text-ink-dim hidden md:inline">
              No wallet required to audit evidence &amp; validity
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to={`/graph/${profile.address}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle border border-surface-border text-ink-muted hover:text-ink hover:border-surface-border-strong text-xs font-mono transition-colors"
            >
              <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Trust Graph</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>

            <button
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-subtle border border-surface-border text-ink-muted hover:text-ink hover:border-surface-border-strong text-xs font-mono transition-colors"
              aria-label="Copy shareable profile link"
            >
              {shareCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-status-verified" aria-hidden="true" />
                  <span className="text-status-verified">Link Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Share Profile</span>
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* ─── Identity + status breakdown ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
          <motion.div variants={fadeRise} className="lg:col-span-2">
            <Panel className="h-full p-6">
              <div className="flex items-start gap-4 mb-5">
                <span className="h-12 w-12 shrink-0 corner-ticks flex items-center justify-center text-primary" aria-hidden="true">
                  <Fingerprint className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                    <h1 className="text-2xl font-bold text-ink tracking-tight">
                      {profile.alias || 'Developer Profile'}
                    </h1>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-primary border border-primary/40 bg-primary-dim px-2 py-0.5">
                      <UserCheck className="h-3 w-3" aria-hidden="true" />
                      Subject
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
                    {profile.bio || 'Developer with evidence-backed attestations anchored on Monad testnet.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-border flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 border border-surface-border">
                  <span className="text-ink-dim uppercase tracking-widest text-[10px]">Wallet</span>
                  <span className="text-ink">{shortenAddress(profile.address, 6)}</span>
                  <button
                    onClick={copyAddress}
                    className="hover:text-ink text-ink-dim transition-colors"
                    title="Copy address"
                    aria-label="Copy wallet address"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-status-verified" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  </button>
                </div>

                <a
                  href={getExplorerAddressUrl(profile.address)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors"
                >
                  <span>Monad Explorer</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </Panel>
          </motion.div>

          <motion.div variants={fadeRise}>
            <Panel className="h-full p-6 flex flex-col">
              <div className="font-mono text-[11px] uppercase tracking-widest-xl text-ink-muted mb-4">
                On-Chain Status Breakdown
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4 flex-1">
                {statTiles.map((tile) => (
                  <div key={tile.key} className="p-3 bg-surface-subtle border border-surface-border flex flex-col justify-between">
                    <div className={cn('font-mono text-[10px] uppercase tracking-widest-xl mb-1', STATUS_TILE_STYLES[tile.key])}>
                      {tile.label}
                    </div>
                    <div className="text-2xl font-bold text-ink font-mono leading-none">{tile.value}</div>
                  </div>
                ))}
              </div>

              <div className="font-mono text-[10px] text-ink-dim leading-relaxed border-t border-surface-border pt-3">
                No numerical trust score exists here. Every count is a distinct on-chain
                record backed by inspectable evidence and issuer standing.
              </div>
            </Panel>
          </motion.div>
        </div>

        {/* ─── Reviewing authorities ──────────────────────────── */}
        <motion.div variants={fadeRise} className="mb-10">
          <SectionHeader
            index="01"
            title="Reviewing Authorities"
            hint="Signers whose attestations appear on this dossier"
            right={
              <span className="font-mono text-xs text-ink-dim">
                {profile.trustedIssuers.length} recognized
              </span>
            }
            className="mb-4"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.trustedIssuers.map((iss) => (
              <Panel key={iss.address} ticks={false} className="p-4 flex items-start justify-between gap-3 bg-surface-subtle">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      className={cn('h-3.5 w-3.5 shrink-0', iss.isAuthorized ? 'text-status-verified' : 'text-status-invalid-issuer')}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-semibold text-ink truncate">{iss.name}</span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5 truncate">{iss.organization}</div>
                  <div className="font-mono text-[11px] text-ink-dim mt-1.5">
                    {shortenAddress(iss.address)}
                  </div>
                </div>
                <span
                  className={cn(
                    'shrink-0 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border',
                    iss.isAuthorized
                      ? 'text-status-verified border-status-verified/40 bg-status-verified/10'
                      : 'text-status-invalid-issuer border-status-invalid-issuer/40 border-dashed bg-transparent'
                  )}
                >
                  {iss.isAuthorized ? 'Authorized' : 'Revoked'}
                </span>
              </Panel>
            ))}
          </div>
        </motion.div>

        {/* ─── Claim ledger ───────────────────────────────────── */}
        <motion.div variants={fadeRise}>
          <SectionHeader
            index="02"
            title="Claim Ledger"
            hint="Every attestation ever recorded — revocations preserved"
            right={
              <span className="font-mono text-xs text-ink-dim">
                {filteredAttestations.length}/{profile.attestations.length} shown
              </span>
            }
            className="mb-4"
          />
        </motion.div>

        <motion.div
          variants={fadeRise}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2 mb-6 bg-surface-subtle border border-surface-border"
        >
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by claim type">
            {CLAIM_FILTERS.map((f) => {
              const count = f.key === 'ALL' ? profile.attestations.length : profile.stats.byClaimType[f.key];
              const active = claimFilter === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setClaimFilter(f.key)}
                  aria-pressed={active}
                  className={cn(
                    'px-3 py-1.5 text-xs transition-colors',
                    active
                      ? 'bg-surface-raised text-ink border border-surface-border-strong'
                      : 'text-ink-muted hover:text-ink border border-transparent'
                  )}
                >
                  {f.label} <span className="font-mono text-ink-dim">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 border-t lg:border-t-0 lg:border-l border-surface-border lg:pl-4 pt-2 lg:pt-0" role="group" aria-label="Filter by validity">
            <span className="text-ink-dim text-[10px] font-mono uppercase tracking-widest mr-1">Status</span>
            {(['ALL', 'VALID', 'REVOKED', 'EXPIRED'] as const).map((v) => {
              const active = validityFilter === v;
              return (
                <button
                  key={v}
                  onClick={() => setValidityFilter(v)}
                  aria-pressed={active}
                  className={cn(
                    'px-2 py-1 text-[11px] font-mono transition-colors',
                    active
                      ? 'bg-surface-raised text-ink border border-surface-border-strong'
                      : 'text-ink-dim hover:text-ink-muted border border-transparent'
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </motion.div>

        {filteredAttestations.length === 0 ? (
          <Panel className="p-12 text-center">
            <p className="text-ink-muted text-sm mb-3">No attestations match the selected filter.</p>
            <button
              onClick={() => {
                setClaimFilter('ALL');
                setValidityFilter('ALL');
              }}
              className="font-mono text-xs text-primary hover:text-primary-bright transition-colors"
            >
              Reset Filters
            </button>
          </Panel>
        ) : (
          <div className="space-y-4">
            {filteredAttestations.map((att, i) => (
              <AttestationCard key={att.id} attestation={att} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export const PassportPage = TrustProfilePage;
