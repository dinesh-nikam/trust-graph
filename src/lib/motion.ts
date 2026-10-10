import type { Transition, Variants } from 'motion/react';

/**
 * Shared motion language for "The Trust Instrument".
 * Motion settles like a physical gauge: fast rise, long decelerating ease-out.
 */

export const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_SNAP: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const settleTransition: Transition = {
  duration: 0.55,
  ease: EASE_SETTLE,
};

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: settleTransition,
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export const staggerParent = (stagger = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});
