import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { StaticNetwork } from './StaticNetwork';

const TrustNetworkScene = lazy(() => import('./TrustNetworkScene'));

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export interface HeroNetworkProps {
  className?: string;
}

/**
 * Cinematic hero backdrop. Lazy-loads the WebGL scene, degrades to a static
 * SVG constellation when WebGL is missing or the user prefers reduced motion,
 * and disables pointer parallax below the md breakpoint.
 */
export const HeroNetwork: React.FC<HeroNetworkProps> = ({ className }) => {
  const reducedMotion = useReducedMotion() ?? false;
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    setWebglOk(supportsWebGL());
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsSmall(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const showScene = webglOk === true && !reducedMotion;

  return (
    <div className={className} aria-hidden="true">
      {showScene ? (
        <Suspense fallback={<StaticNetwork className="h-full w-full" />}>
          <TrustNetworkScene interactive={!isSmall} density={isSmall ? 'low' : 'high'} />
        </Suspense>
      ) : (
        <StaticNetwork className="h-full w-full" />
      )}
    </div>
  );
};
