import { Link } from 'react-router';
import { GLOSSARY, glossaryEntry } from '@/content/glossary';
import { buildMatcher } from '@/lib/glossaryMatcher';
import type { Lang } from '@/store/settings';
import { useBi } from '@/hooks/useBi';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RichText } from './RichText';

const cache: Partial<Record<Lang, ReturnType<typeof buildMatcher>>> = {};

// eslint-disable-next-line react-refresh/only-export-components
export function glossaryMatcher(lang: Lang) {
  return (cache[lang] ??= buildMatcher(GLOSSARY, lang));
}

/** A linked glossary term with a definition preview on hover/focus. */
export function GlossaryTerm({ slug, text }: { slug: string; text: string }) {
  const bi = useBi();
  const e = glossaryEntry(slug);
  if (!e) return <>{text}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={`/glossary?t=${slug}`}
          className="underline decoration-primary/50 decoration-dotted underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
        >
          {text}
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-72 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-border"
      >
        <p className="mb-1 font-medium">{bi(e.term)}</p>
        <RichText text={bi(e.def)} autoLink={false} className="text-xs leading-relaxed text-muted-foreground" />
      </TooltipContent>
    </Tooltip>
  );
}
