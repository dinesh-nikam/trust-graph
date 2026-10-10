import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  GitGraph, 
  Share2, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  UserCheck, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { useTrustProfile } from '../hooks/useTrustGraph';
import { Attestation, ClaimType, ValidityStatus } from '../types';
import { 
  shortenAddress, 
  shortenHash, 
  getClaimTypeDetails, 
  getValidityDetails 
} from '../utils/formatters';
import { getExplorerAddressUrl, getExplorerTxUrl } from '../lib/contract/config';

interface SelectedNode {
  type: 'SUBJECT' | 'CLAIM' | 'ISSUER' | 'EVIDENCE';
  title: string;
  subtitle?: string;
  data: unknown;
  attestation?: Attestation;
}

export const TrustGraphPage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const activeAddress = address || '';
  const { profile, isLoading, error } = useTrustProfile(activeAddress);

  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterType, setFilterType] = useState<'ALL' | ClaimType>('ALL');

  const attestations = useMemo(() => {
    if (!profile) return [];
    if (filterType === 'ALL') return profile.attestations;
    return profile.attestations.filter((a) => a.claimType === filterType);
  }, [profile, filterType]);

  // Set default selected node
  useEffect(() => {
    if (attestations.length > 0 && !selectedNode) {
      const first = attestations[0];
      setSelectedNode({
        type: 'CLAIM',
        title: first.claimTitle,
        subtitle: first.claimType,
        data: first,
        attestation: first,
      });
    }
  }, [attestations]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block h-6 w-6 border-2 border-neutral-600 border-t-indigo-400 rounded-full animate-spin mb-4"></div>
        <p className="text-neutral-400 text-sm font-mono">Constructing Trust Graph from Monad state...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="p-8 rounded-2xl backdrop-blur-md bg-neutral-900 border border-neutral-800">
          <AlertCircle className="h-8 w-8 text-neutral-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-2">{error ? 'Registry Read Failed' : 'No Graph Data'}</h2>
          <p className="text-neutral-400 text-sm mb-6">
            {error instanceof Error ? error.message : `No attestations found to construct graph for ${activeAddress}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-8 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 mb-1">
            <GitGraph className="h-4 w-4 text-indigo-400" />
            <span>GRAPH EXPLORER</span>
            <span className="text-neutral-600">•</span>
            <span>Subject &rarr; Claims &rarr; Issuers &rarr; Evidence</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Trust Graph: {profile.alias || shortenAddress(profile.address)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/profile/${profile.address}`}
            className="px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-xs font-mono transition-colors"
          >
            Profile View
          </Link>
          <Link
            to="/issue"
            className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-mono transition-colors"
          >
            + Issue Claim
          </Link>
        </div>
      </div>

      {/* Filter and Graph Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 mb-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-mono text-[11px]">Filter Claim:</span>
          {(['ALL', 'CONTRACT_DEPLOYED', 'CHALLENGE_COMPLETED', 'CONTRIBUTION_VERIFIED'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterType === t
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t === 'ALL' ? 'All (Show All)' : t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
            className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-neutral-500 font-mono text-[11px] w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
            className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Reset Zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Graph Grid with Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Graph Canvas / Tree View */}
        <div className="lg:col-span-2 rounded-2xl backdrop-blur-md bg-neutral-950 border border-neutral-800 p-6 overflow-x-auto min-h-[560px] flex flex-col justify-between relative shadow-inner">
          <div
            className="transition-transform duration-200 origin-top-left"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            {/* Root Subject Node */}
            <div className="mb-10">
              <button
                onClick={() =>
                  setSelectedNode({
                    type: 'SUBJECT',
                    title: profile.alias || 'Developer',
                    subtitle: profile.address,
                    data: profile,
                  })
                }
                className={`p-4 rounded-xl border text-left transition-all max-w-sm ${
                  selectedNode?.type === 'SUBJECT'
                    ? 'bg-neutral-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/50'
                    : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    SUBJECT ROOT
                  </span>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    {attestations.length} Claims
                  </span>
                </div>
                <div className="font-bold text-white text-sm">{profile.alias || 'Developer Subject'}</div>
                <div className="text-xs font-mono text-neutral-400 mt-0.5">
                  {shortenAddress(profile.address, 6)}
                </div>
              </button>
            </div>

            {/* Branching Tree of Claims */}
            <div className="space-y-8 pl-4 sm:pl-8 border-l-2 border-neutral-800 relative">
              {attestations.map((att) => {
                const claimType = getClaimTypeDetails(att.claimType);
                const validity = getValidityDetails(att.validity);
                const isSelected = selectedNode?.attestation?.id === att.id;

                return (
                  <div key={att.id} className="relative group">
                    {/* Horizontal Connector Tick */}
                    <div className="absolute -left-4 sm:-left-8 top-6 w-4 sm:w-8 h-0.5 bg-neutral-800 group-hover:bg-neutral-600 transition-colors" />

                    {/* Claim Branch Container */}
                    <div className="space-y-3">
                      {/* Claim Node Button */}
                      <button
                        onClick={() =>
                          setSelectedNode({
                            type: 'CLAIM',
                            title: att.claimTitle,
                            subtitle: att.claimType,
                            data: att,
                            attestation: att,
                          })
                        }
                        className={`p-4 rounded-xl border text-left transition-all w-full max-w-lg ${
                          isSelected && selectedNode?.type === 'CLAIM'
                            ? 'bg-neutral-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                            : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${claimType.tagBg}`}>
                            {claimType.label}
                          </span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${validity.badgeClass}`}>
                            {validity.label}
                          </span>
                        </div>

                        <div className="font-semibold text-white text-xs sm:text-sm leading-snug">
                          {att.claimTitle}
                        </div>
                        <div className="text-[11px] text-neutral-400 line-clamp-1 mt-1 font-mono">
                          ID: #{att.id} • SHA-256: {shortenHash(att.evidenceHash, 4)}
                        </div>
                      </button>

                      {/* Sub-Nodes: Reviewer & Evidence */}
                      <div className="pl-6 border-l border-neutral-800/80 space-y-2 pt-1">
                        
                        {/* Reviewer Node */}
                        <button
                          onClick={() =>
                            setSelectedNode({
                              type: 'ISSUER',
                              title: att.issuerName || 'Authorized Issuer',
                              subtitle: att.issuer,
                              data: { issuer: att.issuer, name: att.issuerName, authorized: att.issuerAuthorized },
                              attestation: att,
                            })
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] font-mono transition-all w-full max-w-md ${
                            isSelected && selectedNode?.type === 'ISSUER'
                              ? 'bg-neutral-900 border-emerald-500 text-white'
                              : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <UserCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span className="text-neutral-500">Issuer:</span>
                          <span className="text-neutral-200 truncate">
                            {att.issuerName || shortenAddress(att.issuer)}
                          </span>
                          <span className="text-emerald-400 ml-auto text-[10px]">
                            {att.issuerAuthorized ? '✓ Auth' : '✕ Revoked'}
                          </span>
                        </button>

                        {/* Evidence Node */}
                        <button
                          onClick={() =>
                            setSelectedNode({
                              type: 'EVIDENCE',
                              title: 'Evidence Anchor',
                              subtitle: att.evidenceUrl,
                              data: {
                                url: att.evidenceUrl,
                                hash: att.evidenceHash,
                                manifest: att.evidenceManifest,
                              },
                              attestation: att,
                            })
                          }
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] font-mono transition-all w-full max-w-md ${
                            isSelected && selectedNode?.type === 'EVIDENCE'
                              ? 'bg-neutral-900 border-indigo-500 text-white'
                              : 'bg-neutral-950 border-neutral-850 text-neutral-400 hover:border-neutral-700'
                          }`}
                        >
                          <FileText className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="text-neutral-500">Proof:</span>
                          <span className="text-neutral-300 truncate">
                            {shortenHash(att.evidenceHash, 6)}
                          </span>
                          <span className="text-neutral-500 ml-auto text-[10px]">
                            SHA-256
                          </span>
                        </button>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-900 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>Visualizing {attestations.length} attested claims</span>
            <span>Click any node to inspect verification</span>
          </div>
        </div>

        {/* Node Detail & Verification Inspector Panel */}
        <div className="rounded-2xl backdrop-blur-md bg-neutral-900/60 border border-neutral-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-neutral-800">
              <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Node Inspector</span>
              </div>
              {selectedNode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {selectedNode.type}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    {selectedNode.title}
                  </h3>
                  {selectedNode.subtitle && (
                    <div className="text-xs font-mono text-neutral-400 mt-1 break-all">
                      {selectedNode.subtitle}
                    </div>
                  )}
                </div>

                {/* If selected node is a claim or has attestation context */}
                {selectedNode.attestation && (
                  <div className="space-y-3 pt-3 border-t border-neutral-800/80 text-xs">
                    <div>
                      <div className="text-neutral-500 text-[11px] mb-1">Current Validity:</div>
                      <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800">
                        <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
                          {selectedNode.attestation.validity === 'VALID' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-rose-400" />
                          )}
                          <span>{selectedNode.attestation.validity}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 leading-relaxed">
                          {selectedNode.attestation.validityExplanation}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-neutral-500 text-[11px] mb-1">Evidence Manifest:</div>
                      <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] space-y-1">
                        <div className="truncate text-emerald-400">
                          <a
                            href={selectedNode.attestation.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline flex items-center gap-1"
                          >
                            <span>Open Off-Chain Source</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="text-neutral-400 text-[10px] break-all">
                          SHA-256: {selectedNode.attestation.evidenceHash}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-neutral-500 text-[11px] mb-1">Verified By:</div>
                      <div className="text-neutral-300 font-mono text-[11px]">
                        {selectedNode.attestation.issuerName || shortenAddress(selectedNode.attestation.issuer)}
                        <span className="text-neutral-500 ml-1">
                          ({shortenAddress(selectedNode.attestation.issuer)})
                        </span>
                      </div>
                    </div>

                    {selectedNode.attestation.transactionHash && (
                      <div>
                        <div className="text-neutral-500 text-[11px] mb-1">Blockchain Record:</div>
                        <a
                          href={getExplorerTxUrl(selectedNode.attestation.transactionHash)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>Inspect Monad Transaction</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-neutral-500 font-mono">
                Click any node in the graph to inspect its verification details.
              </div>
            )}
          </div>

          {selectedNode?.attestation && (
            <div className="pt-6 border-t border-neutral-800 mt-6">
              <Link
                to={`/verify/${selectedNode.attestation.id}`}
                className="btn-primary w-full py-2.5 px-4 text-xs"
              >
                <span>Full Independent Audit Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default TrustGraphPage;
