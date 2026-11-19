import { create } from 'zustand';
import { isSoftwareRenderer } from '@/scene/graphics';

export type Quality = 'high' | 'medium' | 'low';

interface SceneState {
  quality: Quality;
  backend: 'webgpu' | 'webgl2' | null;
  /** timestamp of the last user interaction with a 3D view (drives ambient animation in demand mode) */
  lastInteraction: number;
  setQuality: (q: Quality) => void;
  setBackend: (b: 'webgpu' | 'webgl2') => void;
  poke: () => void;
}

const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

export const useSceneStore = create<SceneState>((set) => ({
  quality: typeof document !== 'undefined' && isSoftwareRenderer() ? 'low' : isMobile ? 'medium' : 'high',
  backend: null,
  lastInteraction: typeof performance !== 'undefined' ? performance.now() : 0,
  setQuality: (quality) => set({ quality }),
  setBackend: (backend) => set({ backend }),
  poke: () => set({ lastInteraction: performance.now() }),
}));

export const IS_MOBILE = isMobile;
