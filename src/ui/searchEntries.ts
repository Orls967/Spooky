import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Atom, BookOpenText, Puzzle } from 'lucide-react';
import { ALGORITHMS } from '@/content/algorithms';
import { GLOSSARY } from '@/content/glossary';
import { PUZZLES } from '@/content/puzzles';
import { useSettings } from '@/store/settings';

export interface SearchItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  path: string;
}
export interface SearchGroup {
  heading: string;
  icon: LucideIcon;
  items: SearchItem[];
}

/** Strip KaTeX/markup for plain search hints. */
const plain = (s: string) => s.replace(/\$[^$]*\$/g, '…').replace(/\*\*/g, '');

/** Content-derived search entries: algorithms, glossary terms, puzzle levels (both languages searchable). */
export function useSearchEntries(): SearchGroup[] {
  const { t } = useTranslation();
  const lang = useSettings((s) => s.lang);
  return useMemo(
    () => [
      {
        heading: t('search.groupAlgorithms'),
        icon: Atom,
        items: ALGORITHMS.map((a) => ({
          id: `algo-${a.id}`,
          label: a.title[lang],
          hint: a.summary[lang],
          keywords: `${a.title.id} ${a.title.en} ${a.summary.en}`,
          path: `/algorithms/${a.id}`,
        })),
      },
      {
        heading: t('search.groupGlossary'),
        icon: BookOpenText,
        items: GLOSSARY.map((g) => ({
          id: `term-${g.slug}`,
          label: g.term[lang],
          hint: plain(g.def[lang]),
          keywords: `${g.term.id} ${g.term.en} ${g.aliases.id.join(' ')} ${g.aliases.en.join(' ')}`,
          path: `/glossary?t=${g.slug}`,
        })),
      },
      {
        heading: t('search.groupPuzzles'),
        icon: Puzzle,
        items: PUZZLES.map((p) => ({
          id: `puzzle-${p.id}`,
          label: `${p.id}. ${p.title[lang]}`,
          keywords: `level ${p.id} ${p.title.id} ${p.title.en}`,
          path: `/puzzles/${p.id}`,
        })),
      },
    ],
    [t, lang],
  );
}
