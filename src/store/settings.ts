import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { safeJSONStorage } from '@/lib/storage';

export type ThemePref = 'light' | 'dark' | 'system';
export type Lang = 'id' | 'en';

interface SettingsState {
  theme: ThemePref;
  lang: Lang;
  /** user-forced low quality 3D (in addition to automatic adaptation) */
  lowPower: boolean;
  setTheme: (t: ThemePref) => void;
  setLang: (l: Lang) => void;
  setLowPower: (v: boolean) => void;
}

// NOTE: storage key + shape is mirrored by the inline script in index.html.
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      lang: 'id',
      lowPower: false,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      setLowPower: (lowPower) => set({ lowPower }),
    }),
    { name: 'spooky-settings', storage: safeJSONStorage, version: 1 },
  ),
);

/** Resolved light/dark (kept in sync by ThemeController). */
interface ResolvedThemeState {
  resolved: 'light' | 'dark';
  setResolved: (r: 'light' | 'dark') => void;
}

export const useResolvedTheme = create<ResolvedThemeState>((set) => ({
  resolved: typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  setResolved: (resolved) => set({ resolved }),
}));
