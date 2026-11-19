import { useMemo, type ReactNode } from 'react';
import { Tex } from './Tex';
import { cn } from '@/lib/utils';
import { GlossaryTerm, glossaryMatcher } from './glossaryLink';
import { linkify } from '@/lib/glossaryMatcher';
import { useSettings } from '@/store/settings';

type Piece =
  { kind: 'text'; text: string; slug?: string } | { kind: 'tex'; math: string } | { kind: 'strong'; text: string };
type Block = { kind: 'display'; math: string } | { kind: 'p'; pieces: Piece[] };

/** Pure parser: paragraphs → pieces, with glossary links on the first mention of each term. */
function parse(text: string, link: ((s: string) => { text: string; slug?: string }[]) | null): Block[] {
  return text.split(/\n\s*\n/).map((p): Block => {
    const display = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(p);
    if (display) return { kind: 'display', math: display[1] };
    const pieces: Piece[] = [];
    const re = /\$([^$]+)\$|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    const pushText = (s: string) => {
      if (!s) return;
      if (link) for (const seg of link(s)) pieces.push({ kind: 'text', ...seg });
      else pieces.push({ kind: 'text', text: s });
    };
    while ((m = re.exec(p))) {
      pushText(p.slice(last, m.index));
      if (m[1] !== undefined) pieces.push({ kind: 'tex', math: m[1] });
      else pieces.push({ kind: 'strong', text: m[2] });
      last = re.lastIndex;
    }
    pushText(p.slice(last));
    return { kind: 'p', pieces };
  });
}

/**
 * Tiny markup for bilingual content:
 *   $…$  inline KaTeX     $$…$$ display KaTeX     **…** strong     blank line = new paragraph
 * Plain text runs pass through the glossary auto-linker (first mention of each term per block).
 */
export function RichText({
  text,
  className,
  autoLink = true,
  exclude,
}: {
  text: string;
  className?: string;
  autoLink?: boolean;
  /** glossary slug that must not link to itself */
  exclude?: string;
}) {
  const lang = useSettings((s) => s.lang);
  const blocks = useMemo(() => {
    if (!autoLink) return parse(text, null);
    const seen = new Set<string>(exclude ? [exclude] : []);
    const matcher = glossaryMatcher(lang);
    return parse(text, (s) => linkify(s, matcher, seen));
  }, [text, autoLink, exclude, lang]);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {blocks.map((b, i) =>
        b.kind === 'display' ? (
          <Tex key={i} math={b.math} display className="py-1" />
        ) : (
          <p key={i}>
            {b.pieces.map((pc, k): ReactNode => {
              if (pc.kind === 'tex') return <Tex key={k} math={pc.math} />;
              if (pc.kind === 'strong')
                return (
                  <strong key={k} className="font-semibold text-foreground">
                    {pc.text}
                  </strong>
                );
              return pc.slug ? <GlossaryTerm key={k} slug={pc.slug} text={pc.text} /> : <span key={k}>{pc.text}</span>;
            })}
          </p>
        ),
      )}
    </div>
  );
}
