import React from 'react';

/**
 * Static trust-network diagram — Suspense fallback for the 3D scene and the
 * permanent render path when WebGL is unavailable or reduced motion is set.
 */

interface Node {
  x: number;
  y: number;
  r: number;
  color: string;
  label?: string;
}

const NODES: Node[] = [
  { x: 400, y: 300, r: 11, color: '#8B5CF6' },
  { x: 235, y: 170, r: 7, color: '#34D399' },
  { x: 565, y: 175, r: 8, color: '#8B5CF6' },
  { x: 585, y: 420, r: 6.5, color: '#8B5CF6' },
  { x: 225, y: 425, r: 6, color: '#E5B567' },
  { x: 385, y: 480, r: 7, color: '#8B5CF6' },
  // issuer satellites
  { x: 640, y: 105, r: 4, color: '#4c3a8f' },
  { x: 665, y: 470, r: 4, color: '#4c3a8f' },
  { x: 300, y: 520, r: 4, color: '#4c3a8f' },
  // evidence satellites
  { x: 140, y: 120, r: 3.2, color: '#22D3EE' },
  { x: 495, y: 120, r: 3.2, color: '#22D3EE' },
  { x: 520, y: 480, r: 3.2, color: '#22D3EE' },
  { x: 130, y: 460, r: 3.2, color: '#22D3EE' },
];

const EDGES: [number, number, string, number][] = [
  [0, 1, '#8B5CF6', 0.35],
  [0, 2, '#8B5CF6', 0.35],
  [0, 3, '#8B5CF6', 0.35],
  [0, 4, '#8B5CF6', 0.35],
  [0, 5, '#8B5CF6', 0.35],
  [2, 6, '#35354A', 0.8],
  [3, 7, '#35354A', 0.8],
  [5, 8, '#35354A', 0.8],
  [1, 9, '#22D3EE', 0.4],
  [2, 10, '#22D3EE', 0.4],
  [3, 11, '#22D3EE', 0.4],
  [4, 12, '#22D3EE', 0.4],
];

export const StaticNetwork: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 800 600"
    preserveAspectRatio="xMidYMid slice"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="static-fade" cx="50%" cy="46%" r="65%">
        <stop offset="0%" stopColor="#09090F" stopOpacity="0" />
        <stop offset="78%" stopColor="#09090F" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#09090F" stopOpacity="0.92" />
      </radialGradient>
    </defs>

    {/* instrument rings */}
    <circle cx="400" cy="300" r="105" fill="none" stroke="#8B5CF6" strokeOpacity="0.16" strokeWidth="1" />
    <circle
      cx="400"
      cy="300"
      r="148"
      fill="none"
      stroke="#35354A"
      strokeOpacity="0.5"
      strokeWidth="1"
      strokeDasharray="3 9"
    />

    {EDGES.map(([a, b, color, opacity], i) => (
      <line
        key={i}
        x1={NODES[a].x}
        y1={NODES[a].y}
        x2={NODES[b].x}
        y2={NODES[b].y}
        stroke={color}
        strokeOpacity={opacity * 0.55}
        strokeWidth="1"
      />
    ))}

    {NODES.map((n, i) => (
      <g key={i}>
        <circle cx={n.x} cy={n.y} r={n.r * 2.1} fill="none" stroke={n.color} strokeOpacity="0.2" strokeWidth="1" />
        <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fillOpacity="0.9" />
      </g>
    ))}

    <rect width="800" height="600" fill="url(#static-fade)" />
  </svg>
);
