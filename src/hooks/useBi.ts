import { useCallback } from 'react';
import { useSettings, type Lang } from '@/store/settings';
import type { Bi } from '@/content/schema';

export function pickBi(b: Bi, lang: Lang): string {
  return b[lang];
}

/** Returns a translator for `{ id, en }` content objects in the current language. */
export function useBi(): (b: Bi) => string {
  const lang = useSettings((s) => s.lang);
  return useCallback((b: Bi) => b[lang], [lang]);
}
