import type { GlossaryEntry } from '@/content/glossary';
import type { Lang } from '@/store/settings';

export interface Segment {
  text: string;
  slug?: string;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Build a case-insensitive, Unicode-aware matcher for all glossary surface forms of a language. */
export function buildMatcher(entries: GlossaryEntry[], lang: Lang) {
  const forms = new Map<string, string>();
  for (const e of entries) {
    for (const f of [e.term[lang], ...e.aliases[lang]]) {
      const key = f.toLowerCase().trim();
      if (key.length >= 3 && !forms.has(key)) forms.set(key, e.slug);
    }
  }
  const alternation = [...forms.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escape)
    .join('|');
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, 'giu');
  return { re, forms };
}

/** Split text into plain and linked segments; each slug is linked once per `seen` set. */
export function linkify(text: string, matcher: ReturnType<typeof buildMatcher>, seen: Set<string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  matcher.re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = matcher.re.exec(text))) {
    const slug = matcher.forms.get(m[1].toLowerCase());
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[1], slug });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
