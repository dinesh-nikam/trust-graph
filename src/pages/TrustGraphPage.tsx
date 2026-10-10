import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  GitGraph,
  ExternalLink,
  ArrowRight,
  X,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import '@xyflow/react/dist/style.css';

import { useTrustProfile } from '../hooks/useTrustGraph';
import { Attestation, ClaimType } from '../types';
import { shortenAddress, getValidityDetails } from '../utils/formatters';
import { DEMO_WALLETS, getExplorerTxUrl, getExplorerAddressUrl } from '../lib/contract/config';
import { ValidityBadge } from '../components/shared/ValidityBadge';
import { EvidenceHashWidget } from '../components/shared/EvidenceHashWidget';
import { Panel, SectionHeader } from '../components/ui/Panel';
import { buildTrustGraph, type GraphNodeKind, type TrustNodeData } from '../components/graph/graphLayout';
import { nodeTypes } from '../components/graph/nodes';
import { settleTransition } from '../lib/motion';

type Selection = { id: string; kind: GraphNodeKind; attestation?: Attestation };

const EDGE_IDLE = '#35354A';
const EDGE_DIM = '#23232F';
const EDGE_CLAIM = '#8B5CF6';
const EDGE_EVIDENCE = '#22D3EE';

const TrustExplorer: React.FC<{ address: string }> = ({ address }) => {
  const { profile, isLoading, error } = useTrustProfile(address);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const { fitView } = useReactFlow();

  const [selected, setSelected] = useState<Selection | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | ClaimType>('ALL');

  const attestations = useMemo(() => {
    if (!profile) return [];
    if (filterType === 'ALL') return profile.attestations;
    return profile.attestations.filter((a) => a.claimType === filterType);
  }, [profile, filterType]);

  // Default inspection target: first claim; re-target if the selection is filtered out.
  // Drawer only opens on explicit node click.
  useEffect(() => {
    if (attestations.length === 0) return;
    const stillPresent =
      selected && (!selected.attestation || attestations.some((a) => a.id === selected.attestation!.id));
    if (!stillPresent) {
      const first = attestations[0];
      setSelected({ id: `claim-${first.id}`, kind: 'CLAIM', attestation: first });
    }
  }, [attestations, selected]);

  const { nodes, edges: baseEdges } = useMemo(
    () => (profile ? buildTrustGraph(profile, attestations) : { nodes: [], edges: [] }),
    [profile, attestations]
  );

  const edges = useMemo(() => {
    const activeColor = selected?.kind === 'EVIDENCE' ? EDGE_EVIDENCE : EDGE_CLAIM;
    return baseEdges.map((e) => {
      const active = !!selected && (e.source === selected.id || e.target === selected.id);
      return {
        ...e,
        animated: active && !shouldReduceMotion,
        style: {
          stroke: active ? activeColor : selected ? EDGE_DIM : EDGE_IDLE,
          strokeWidth: active ? 2 : 1,
          opacity: active ? 1 : selected ? 0.75 : 1,
        },
      };
    });
  }, [baseEdges, selected, shouldReduceMotion]);

  useEffect(() => {
    if (!nodes.length) return;
    const t = setTimeout(
      () => fitView({ padding: 0.22, duration: shouldReduceMotion ? 0 : 800 }),
      600
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const handleNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    const data = node.data as TrustNodeData;
    setSelected({ id: node.id, kind: data.kind, attestation: data.attestation });
    setDrawerOpen(true);
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center" role="status">
        <div className="inline-block h-5 w-5 border-2 border-surface-border-strong border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-ink-dim text-xs font-mono uppercase tracking-widest-xl">
          Constructing graph from Monad state…
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24">
        <Panel className="p-10 text-center">
          <AlertCircle className="h-6 w-6 text-ink-faint mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-ink mb-2">No Graph Data</h2>
          <p className="text-ink-dim text-xs mb-6 font-mono">
            No attestations found for {shortenAddress(address, 8)}.
          </p>
          <Link
            to={`/graph/${DEMO_WALLETS.DEVELOPER.address}`}
            className="inline-block px-4 py-2 bg-primary text-white font-semibold text-xs hover:bg-primary-bright transition-colors"
          >
            Load Demo Graph
          </Link>
        </Panel>
      </div>
    );
  }

  const filterTabs: Array<'ALL' | ClaimType> = [
    'ALL',
    'CONTRACT_DEPLOYED',
    'CHALLENGE_COMPLETED',
    'CONTRIBUTION_VERIFIED',
  ];

  return (
    <div className="animate-page-enter max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-16">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-6 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <GitGraph className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-[10px] text-ink-dim uppercase tracking-widest-xl">Graph Explorer</span>
            <span className="text-ink-faint">·</span>
            <span className="font-mono text-[10px] text-ink-faint tracking-wide hidden sm:inline">
              Subject → Claims → Issuers → Evidence
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            {profile.alias || shortenAddress(profile.address, 6)}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/profile/${profile.address}`}
            className="px-3 py-1.5 border border-surface-border bg-surface text-ink-muted hover:text-ink hover:border-surface-border-strong text-xs font-mono transition-colors"
          >
            Profile View
          </Link>
          <Link
            to="/issue"
            className="px-3 py-1.5 border border-primary/40 bg-primary-dim text-primary-bright hover:bg-primary/20 text-xs font-mono transition-colors"
          >
            + Issue
          </Link>
        </div>
      </div>

      {/* ─── Filter rail ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-surface-subtle border border-surface-border mb-4">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-mono text-[10px] text-ink-faint mr-1 tracking-widest-xl uppercase">Filter</span>
          {filterTabs.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              aria-pressed={filterType === t}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                filterType === t
                  ? 'bg-surface-raised text-ink border border-surface-border-strong'
                  : 'text-ink-dim hover:text-ink-muted border border-transparent'
              }`}
            >
              {t === 'ALL' ? 'All' : t.split('_')[0]}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4 font-mono text-[9px] uppercase tracking-widest text-ink-dim">
          <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />Subject</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-ink-muted" aria-hidden="true" />Claim</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-status-verified" aria-hidden="true" />Issuer</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full bg-evidence" aria-hidden="true" />Evidence</span>
        </div>
      </div>

      {/* ─── Graph + Inspector ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
        <Panel ticks={false} className="h-[68vh] min-h-[480px] overflow-hidden">
          <ReactFlow
            key={filterType}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
            fitViewOptions={{ padding: 0.22 }}
            minZoom={0.35}
            maxZoom={1.5}
            proOptions={{ hideAttribution: false }}
            className="trust-flow"
            aria-label={`Trust graph for ${profile.alias || profile.address}`}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.3} color="#1E1E2C" />
            <Controls showInteractive={false} position="bottom-right" />
          </ReactFlow>
        </Panel>

        {/* Inspector — persistent side panel on lg+ */}
        <Panel as="aside" className="hidden lg:flex flex-col sticky top-20">
          <div className="p-5 pb-0">
            <SectionHeader
              index="◈"
              title="Inspector"
              right={
                selected ? (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 bg-surface-subtle text-ink-muted border border-surface-border uppercase tracking-widest">
                    {selected.kind}
                  </span>
                ) : undefined
              }
            />
          </div>
          <div className="p-5 flex-1">
            <motion.div
              key={selected?.id ?? 'empty'}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={settleTransition}
            >
              {selected ? (
                <InspectorContent
                  selection={selected}
                  profileAddress={profile.address}
                />
              ) : (
                <div className="py-14 text-center font-mono text-[10px] text-ink-faint tracking-widest-xl uppercase">
                  Select a node to inspect
                </div>
              )}
            </motion.div>
          </div>
        </Panel>
      </div>

      {/* ─── Mobile inspection drawer ───────────────────────── */}
      <AnimatePresence>
        {drawerOpen && selected && (
          <>
            <motion.button
              key="drawer-backdrop"
              type="button"
              aria-label="Close inspector"
              className="fixed inset-0 z-30 bg-black/60 lg:hidden cursor-default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="drawer-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Node inspector"
              className="fixed inset-x-0 bottom-0 z-40 lg:hidden max-h-[78vh] overflow-y-auto bg-surface border-t border-surface-border-strong"
              initial={shouldReduceMotion ? false : { y: '100%' }}
              animate={{ y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={settleTransition}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border sticky top-0 bg-surface">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest-xl text-ink-dim">Inspector</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 bg-surface-subtle text-ink-muted border border-surface-border uppercase tracking-widest">
                    {selected.kind}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close inspector"
                  className="p-1.5 text-ink-dim hover:text-ink transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="p-5">
                <InspectorContent selection={selected} profileAddress={profile.address} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Inspector content by node kind ─────────────────────── */

const InspectorContent: React.FC<{ selection: Selection; profileAddress: string }> = ({
  selection,
  profileAddress,
}) => {
  const att = selection.attestation;

  if (selection.kind === 'SUBJECT') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink leading-snug">Developer Subject</h3>
          <p className="font-mono text-[11px] text-ink-dim mt-1 break-all">{profileAddress}</p>
        </div>
        <Link
          to={`/profile/${profileAddress}`}
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary-bright text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Open Full Passport</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (!att) return null;

  if (selection.kind === 'CLAIM') {
    return (
      <div className="space-y-4">
        <div>
          <ValidityBadge status={att.validity} className="mb-2" />
          {!att.transactionHash && (
            <span className="ml-2 font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-status-pending/40 text-status-pending bg-status-pending/[0.07]">
              Local Fixture
            </span>
          )}
          <h3 className="text-sm font-semibold text-ink leading-snug">{att.claimTitle}</h3>
          <p className="font-mono text-[10px] text-ink-dim mt-1">#{att.id}</p>
        </div>

        <div>
          <span className="font-mono text-[10px] text-ink-dim block mb-1 tracking-widest-xl uppercase">Validity</span>
          <div className="p-2.5 bg-surface-subtle border border-surface-border">
            <p className="font-mono text-[10px] text-ink-muted leading-relaxed">
              {att.validityExplanation || getValidityDetails(att.validity).explanation}
            </p>
          </div>
        </div>

        <div>
          <span className="font-mono text-[10px] text-ink-dim block mb-1.5 tracking-widest-xl uppercase">Reviewed By</span>
          <div className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
            <UserCheck className="h-3.5 w-3.5 text-status-verified shrink-0" aria-hidden="true" />
            <span className="truncate">{att.issuerName || shortenAddress(att.issuer)}</span>
            <span className="text-ink-dim">({shortenAddress(att.issuer)})</span>
          </div>
        </div>

        <EvidenceHashWidget hash={att.evidenceHash} status={att.validity} />

        <a
          href={att.evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-evidence hover:text-evidence/80 transition-colors"
        >
          <span>Open Evidence Source</span>
          <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
        </a>

        {att.transactionHash && (
          <div>
            <span className="font-mono text-[10px] text-ink-dim block mb-1 tracking-widest-xl uppercase">On-Chain Record</span>
            <a
              href={getExplorerTxUrl(att.transactionHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] text-evidence hover:text-evidence/80 transition-colors"
            >
              <span>Inspect Monad Tx</span>
              <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
            </a>
          </div>
        )}

        <Link
          to={`/verify/${att.id}`}
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary-bright text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Full Audit Page</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  if (selection.kind === 'ISSUER') {
    const authorized = att.issuerAuthorized;
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink leading-snug">{att.issuerName || 'Authorized Issuer'}</h3>
          <p className="font-mono text-[11px] text-ink-dim mt-1 break-all">{att.issuer}</p>
        </div>
        <div className="p-2.5 bg-surface-subtle border border-surface-border">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] text-ink-dim uppercase tracking-widest-xl">Registry Authority</span>
            <span className={`font-mono text-[10px] font-bold uppercase tracking-widest ${authorized ? 'text-status-verified' : 'text-status-invalid-issuer'}`}>
              {authorized ? '✓ Authorized' : '✕ Removed'}
            </span>
          </div>
        </div>
        <a
          href={getExplorerAddressUrl(att.issuer)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-evidence hover:text-evidence/80 transition-colors"
        >
          <span>Inspect Issuer on Explorer</span>
          <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
        </a>
        <Link
          to={`/verify/${att.id}`}
          className="w-full py-2.5 px-4 bg-primary hover:bg-primary-bright text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>Full Audit Page</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  // EVIDENCE
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-ink leading-snug">Evidence Anchor</h3>
        <p className="font-mono text-[10px] text-ink-dim mt-1 uppercase tracking-widest-xl">SHA-256 · Immutable</p>
      </div>
      <EvidenceHashWidget hash={att.evidenceHash} status={att.validity} />
      <a
        href={att.evidenceUrl}
        target="_blank"
        rel="noreferrer"
        className="block font-mono text-[10px] text-evidence hover:text-evidence/80 break-all transition-colors"
      >
        {att.evidenceUrl} <ExternalLink className="h-2.5 w-2.5 inline" aria-hidden="true" />
      </a>
      <Link
        to={`/verify/${att.id}`}
        className="w-full py-2.5 px-4 bg-primary hover:bg-primary-bright text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
      >
        <span>Full Audit Page</span>
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
};

export const TrustGraphPage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const activeAddress = address || DEMO_WALLETS.DEVELOPER.address;
  return (
    <ReactFlowProvider>
      <TrustExplorer address={activeAddress} />
    </ReactFlowProvider>
  );
};

export default TrustGraphPage;
