import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

type Vec3 = [number, number, number];

const COLORS = {
  primary: '#8B5CF6',
  primaryDim: '#4c3a8f',
  evidence: '#22D3EE',
  verified: '#34D399',
  expired: '#E5B567',
  edge: '#35354A',
  edgeViolet: 'rgba(139, 92, 246, 0.38)',
  edgeEvidence: 'rgba(34, 211, 238, 0.30)',
  particle: '#62627A',
};

interface NodeSpec {
  pos: Vec3;
  color: string;
  size: number;
  delay: number;
  pulse?: boolean;
  wire?: boolean;
}

const SUBJECT_POS: Vec3 = [0.35, 0.05, 0];

const CLAIM_NODES: NodeSpec[] = [
  { pos: [-1.75, 1.2, -0.7], color: COLORS.verified, size: 0.17, delay: 0.35, wire: true },
  { pos: [2.0, 0.9, -1.2], color: COLORS.primary, size: 0.19, delay: 0.45, pulse: true, wire: true },
  { pos: [1.55, -1.1, 0.5], color: COLORS.primary, size: 0.16, delay: 0.55, wire: true },
  { pos: [-2.05, -0.85, 0.9], color: COLORS.expired, size: 0.15, delay: 0.65, wire: true },
  { pos: [-0.4, -1.7, -1.4], color: COLORS.primary, size: 0.17, delay: 0.75, wire: true },
];

// Deterministic satellite layout: issuer + evidence per claim
const ISSUER_OFFSETS: Vec3[] = [
  [1.05, 0.65, 0.75],
  [-0.85, -0.55, 1.05],
];
const SATELLITE_SIZES = { issuer: 0.09, evidence: 0.07 };

function buildGraph(): { nodes: NodeSpec[]; edges: { a: Vec3; b: Vec3; color: string; opacity: number }[] } {
  const nodes: NodeSpec[] = [
    { pos: SUBJECT_POS, color: COLORS.primary, size: 0.3, delay: 0.1, pulse: true, wire: true },
  ];
  const edges: { a: Vec3; b: Vec3; color: string; opacity: number }[] = [];

  CLAIM_NODES.forEach((claim, i) => {
    nodes.push(claim);
    edges.push({ a: SUBJECT_POS, b: claim.pos, color: COLORS.edgeViolet, opacity: 0.9 });

    const issuerPos: Vec3 = [
      claim.pos[0] + ISSUER_OFFSETS[0][0],
      claim.pos[1] + ISSUER_OFFSETS[0][1],
      claim.pos[2] + ISSUER_OFFSETS[0][2],
    ];
    const evidencePos: Vec3 = [
      claim.pos[0] + ISSUER_OFFSETS[1][0],
      claim.pos[1] + ISSUER_OFFSETS[1][1],
      claim.pos[2] + ISSUER_OFFSETS[1][2],
    ];

    nodes.push({ pos: issuerPos, color: COLORS.primaryDim, size: SATELLITE_SIZES.issuer, delay: 0.85 + i * 0.06 });
    nodes.push({ pos: evidencePos, color: COLORS.evidence, size: SATELLITE_SIZES.evidence, delay: 0.95 + i * 0.06 });

    edges.push({ a: claim.pos, b: issuerPos, color: COLORS.edge, opacity: 0.8 });
    edges.push({ a: claim.pos, b: evidencePos, color: COLORS.edgeEvidence, opacity: 0.9 });
  });

  return { nodes, edges };
}

function GraphNode({ spec }: { spec: NodeSpec }) {
  const group = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = THREE.MathUtils.clamp((state.clock.elapsedTime - spec.delay) / 0.9, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const pulse = spec.pulse ? 1 + Math.sin(state.clock.elapsedTime * 1.3 + spec.delay * 9) * 0.09 : 1;
    group.current.scale.setScalar(Math.max(spec.size * eased * pulse, 0.0001));
    group.current.rotation.y = state.clock.elapsedTime * 0.25 + spec.delay * 4;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18 + spec.delay) * 0.25;
  });

  return (
    <group ref={group} position={spec.pos} scale={0.0001}>
      <mesh>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={spec.color} transparent opacity={0.9} />
      </mesh>
      {spec.wire && (
        <mesh scale={1.9}>
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={spec.color} wireframe transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  );
}

function InstrumentRings() {
  const ringA = useRef<THREE.Mesh>(null!);
  const ringB = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ringA.current.rotation.z = t * 0.08;
    ringB.current.rotation.z = -t * 0.05;
    const s = THREE.MathUtils.clamp((t - 0.2) / 1.2, 0, 1);
    const eased = 1 - Math.pow(1 - s, 3);
    ringA.current.scale.setScalar(Math.max(eased, 0.0001));
    ringB.current.scale.setScalar(Math.max(eased * 0.98, 0.0001));
  });

  return (
    <group position={SUBJECT_POS}>
      <mesh ref={ringA} rotation={[Math.PI / 2.25, 0.2, 0]}>
        <torusGeometry args={[1.05, 0.004, 8, 96]} />
        <meshBasicMaterial color={COLORS.primary} transparent opacity={0.28} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.8, -0.35, 0]}>
        <torusGeometry args={[1.45, 0.003, 8, 96]} />
        <meshBasicMaterial color={COLORS.edge} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function ParticleField({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    // Deterministic PRNG so the constellation is identical every load
    let seed = 0x9e3779b9;
    const rand = () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (rand() - 0.5) * 16;
      arr[i * 3 + 1] = (rand() - 0.5) * 9;
      arr[i * 3 + 2] = (rand() - 0.5) * 8 - 2;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    points.current.rotation.y += delta * 0.012;
    const s = THREE.MathUtils.clamp((state.clock.elapsedTime - 0.6) / 1.5, 0, 1);
    (points.current.material as THREE.PointsMaterial).opacity = 0.5 * s;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={COLORS.particle}
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function NetworkGraph({ interactive }: { interactive: boolean }) {
  const group = useRef<THREE.Group>(null!);
  const pointer = useRef({ x: 0, y: 0 });

  const { nodes, edges } = useMemo(buildGraph, []);

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [interactive]);

  useFrame((state, delta) => {
    group.current.rotation.y += delta * 0.055;
    const targetX = interactive ? pointer.current.y * 0.1 : 0;
    const targetZ = interactive ? pointer.current.x * 0.06 : 0;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, targetX, 2.2, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, targetZ, 2.2, delta);
  });

  return (
    <group ref={group} rotation={[0.08, 0, 0]}>
      {edges.map((e, i) => (
        <Line
          key={i}
          points={[e.a, e.b]}
          color={e.color}
          lineWidth={1}
          transparent
          opacity={e.opacity}
          dashed={false}
        />
      ))}
      {nodes.map((spec, i) => (
        <GraphNode key={i} spec={spec} />
      ))}
      <InstrumentRings />
    </group>
  );
}

export interface TrustNetworkSceneProps {
  interactive: boolean;
  density: 'low' | 'high';
}

const TrustNetworkScene: React.FC<TrustNetworkSceneProps> = ({ interactive, density }) => {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.55, 8.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
    >
      <fog attach="fog" args={['#09090F', 9, 17]} />
      <NetworkGraph interactive={interactive} />
      <ParticleField count={density === 'low' ? 140 : 260} />
    </Canvas>
  );
};

export default TrustNetworkScene;
