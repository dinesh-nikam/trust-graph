import type { Edge, Node } from '@xyflow/react';
import type { Attestation, TrustProfile } from '../../types';
import { shortenAddress, shortenHash } from '../../utils/formatters';

export type GraphNodeKind = 'SUBJECT' | 'CLAIM' | 'ISSUER' | 'EVIDENCE';

export type TrustNodeData = {
  kind: GraphNodeKind;
  label: string;
  subtitle: string;
  entranceDelay: number;
  claimCount?: number;
  validity?: Attestation['validity'];
  claimTypeLabel?: string;
  claimTypeTag?: string;
  authorized?: boolean;
  isFixture?: boolean;
  attestation?: Attestation;
};

export type TrustNode = Node<TrustNodeData>;
export type TrustEdge = Edge;

const CLAIM_X = 0;
const SATELLITE_X = 330;
const ROW_HEIGHT = 168;

export function buildTrustGraph(
  profile: TrustProfile,
  attestations: Attestation[]
): { nodes: TrustNode[]; edges: TrustEdge[] } {
  const nodes: TrustNode[] = [];
  const edges: TrustEdge[] = [];

  const totalHeight = Math.max(attestations.length - 1, 0) * ROW_HEIGHT;
  let y = -totalHeight / 2;

  nodes.push({
    id: 'subject',
    type: 'subject',
    position: { x: CLAIM_X - 330, y: -52 },
    data: {
      kind: 'SUBJECT',
      label: profile.alias || 'Developer Subject',
      subtitle: shortenAddress(profile.address, 6),
      claimCount: attestations.length,
      entranceDelay: 0,
    },
    draggable: false,
  });

  attestations.forEach((att, i) => {
    const claimId = `claim-${att.id}`;
    const issuerId = `issuer-${att.id}`;
    const evidenceId = `evidence-${att.id}`;
    const centerY = y + i * ROW_HEIGHT;

    nodes.push({
      id: claimId,
      type: 'claim',
      position: { x: CLAIM_X, y: centerY - 44 },
      data: {
        kind: 'CLAIM',
        label: att.claimTitle,
        subtitle: `#${att.id} · ${shortenHash(att.evidenceHash, 4)}`,
        validity: att.validity,
        claimTypeLabel: att.claimType,
        isFixture: !att.transactionHash,
        entranceDelay: 0.12 + i * 0.07,
        attestation: att,
      },
      draggable: false,
    });

    nodes.push({
      id: issuerId,
      type: 'issuer',
      position: { x: SATELLITE_X, y: centerY - 76 },
      data: {
        kind: 'ISSUER',
        label: att.issuerName || 'Authorized Issuer',
        subtitle: shortenAddress(att.issuer, 4),
        authorized: att.issuerAuthorized,
        entranceDelay: 0.24 + i * 0.07,
        attestation: att,
      },
      draggable: false,
    });

    nodes.push({
      id: evidenceId,
      type: 'evidence',
      position: { x: SATELLITE_X, y: centerY + 26 },
      data: {
        kind: 'EVIDENCE',
        label: shortenHash(att.evidenceHash, 6),
        subtitle: 'SHA-256 evidence hash',
        entranceDelay: 0.3 + i * 0.07,
        attestation: att,
      },
      draggable: false,
    });

    edges.push({
      id: `e-subject-${claimId}`,
      source: 'subject',
      target: claimId,
      sourceHandle: 'r',
      targetHandle: 'l',
      type: 'smoothstep',
    });
    edges.push({
      id: `e-${claimId}-${issuerId}`,
      source: claimId,
      target: issuerId,
      sourceHandle: 'r2',
      targetHandle: 'l',
      type: 'smoothstep',
    });
    edges.push({
      id: `e-${claimId}-${evidenceId}`,
      source: claimId,
      target: evidenceId,
      sourceHandle: 'r3',
      targetHandle: 'l',
      type: 'smoothstep',
    });
  });

  return { nodes, edges };
}
