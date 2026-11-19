import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/storage';

interface ProgressState {
  /** best stars per puzzle id */
  stars: Record<number, number>;
  record: (id: number, stars: number) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      stars: {},
      record: (id, stars) => {
        if ((get().stars[id] ?? 0) >= stars) return;
        set({ stars: { ...get().stars, [id]: stars } });
      },
      reset: () => set({ stars: {} }),
    }),
    { name: 'spooky-progress', storage: safeJSONStorage, version: 1 },
  ),
);

export function isUnlocked(stars: Record<number, number>, id: number): boolean {
  return id === 1 || (stars[id - 1] ?? 0) > 0;
}
