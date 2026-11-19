import type { LucideIcon } from 'lucide-react';
import { Atom, BookOpenText, Cable, Coins, Info, Orbit, Puzzle, Workflow } from 'lucide-react';

export type ModuleKey = 'intro' | 'bloch' | 'spooky' | 'composer' | 'algorithms' | 'puzzles' | 'glossary' | 'about';

export interface ModuleRoute {
  key: ModuleKey;
  path: string;
  icon: LucideIcon;
  /** index shown in the module rail ("01", "02"…) */
  index: string;
  kind: 'module' | 'reference';
}

export const MODULES: readonly ModuleRoute[] = [
  { key: 'intro', path: '/', icon: Coins, index: '01', kind: 'module' },
  { key: 'bloch', path: '/bloch', icon: Orbit, index: '02', kind: 'module' },
  { key: 'spooky', path: '/spooky', icon: Cable, index: '03', kind: 'module' },
  { key: 'composer', path: '/composer', icon: Workflow, index: '04', kind: 'module' },
  { key: 'algorithms', path: '/algorithms', icon: Atom, index: '05', kind: 'module' },
  { key: 'puzzles', path: '/puzzles', icon: Puzzle, index: '06', kind: 'module' },
  { key: 'glossary', path: '/glossary', icon: BookOpenText, index: '07', kind: 'reference' },
  { key: 'about', path: '/about', icon: Info, index: '08', kind: 'reference' },
];

export function nextModule(key: ModuleKey): ModuleRoute | undefined {
  const i = MODULES.findIndex((m) => m.key === key);
  return i >= 0 ? MODULES[i + 1] : undefined;
}
