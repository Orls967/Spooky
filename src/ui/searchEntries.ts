import type { LucideIcon } from 'lucide-react';

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

/** Content-derived search entries (glossary, algorithms, puzzles). Filled in as modules land. */
export function useSearchEntries(): SearchGroup[] {
  return [];
}
