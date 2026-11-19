import { useFrame } from '@react-three/fiber';
import { useSceneStore } from '@/store/scene';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';

const ACTIVE_MS = 7000;

/**
 * In `frameloop="demand"` nothing renders unless invalidated. This keeps gentle ambient motion alive for a few
 * seconds after the last interaction, then lets the canvas go fully idle (zero GPU work).
 */
export function AmbientTicker(): null {
  useFrame(({ invalidate }) => {
    if (document.hidden) return;
    if (prefersReducedMotion()) return;
    if (performance.now() - useSceneStore.getState().lastInteraction < ACTIVE_MS) invalidate();
  });
  return null;
}
