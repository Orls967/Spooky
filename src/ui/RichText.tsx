import { Fragment, type ReactNode } from 'react';
import { Tex } from './Tex';
import { cn } from '@/lib/utils';
import { GlossaryAutoLink } from './glossaryLink';

/**
 * Tiny markup for bilingual content:
 *   $…$  inline KaTeX     $$…$$ display KaTeX     **…** strong     blank line = new paragraph
 * Plain text runs pass through the glossary auto-linker (first mention of each term per block).
 */
export function RichText({
  text,
  className,
  autoLink = true,
}: {
  text: string;
  className?: string;
  autoLink?: boolean;
}) {
  const seen = new Set<string>();
  const paras = text.split(/\n\s*\n/);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {paras.map((p, i) => {
        const display = /^\s*\$\$([\s\S]+)\$\$\s*$/.exec(p);
        if (display) return <Tex key={i} math={display[1]} display className="py-1" />;
        return <p key={i}>{renderInline(p, autoLink ? seen : null)}</p>;
      })}
    </div>
  );
}

function renderInline(s: string, seen: Set<string> | null): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\$([^$]+)\$|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last)
      out.push(
        <Fragment key={k++}>
          {seen ? <GlossaryAutoLink text={s.slice(last, m.index)} seen={seen} /> : s.slice(last, m.index)}
        </Fragment>,
      );
    if (m[1] !== undefined) out.push(<Tex key={k++} math={m[1]} />);
    else
      out.push(
        <strong key={k++} className="font-semibold text-foreground">
          {m[2]}
        </strong>,
      );
    last = re.lastIndex;
  }
  if (last < s.length)
    out.push(
      <Fragment key={k}>{seen ? <GlossaryAutoLink text={s.slice(last)} seen={seen} /> : s.slice(last)}</Fragment>,
    );
  return out;
}
