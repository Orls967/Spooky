import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Search } from 'lucide-react';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { RichText } from '@/ui/RichText';
import { GLOSSARY, glossaryEntry } from '@/content/glossary';
import { useBi } from '@/hooks/useBi';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/utils';

export default function Glossary() {
  const { t } = useTranslation();
  const bi = useBi();
  const lang = useSettings((s) => s.lang);
  const [params] = useSearchParams();
  const focus = params.get('t');
  const [q, setQ] = useState('');

  const sorted = useMemo(() => [...GLOSSARY].sort((a, b) => a.term[lang].localeCompare(b.term[lang], lang)), [lang]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return sorted;
    return sorted.filter((e) =>
      [e.term[lang], ...e.aliases[lang], e.def[lang]].some((s) => s.toLowerCase().includes(k)),
    );
  }, [q, sorted, lang]);
  const letters = useMemo(() => [...new Set(shown.map((e) => e.term[lang][0].toUpperCase()))], [shown, lang]);

  // a deep link to a term clears any filter that would hide it
  useEffect(() => {
    if (focus) setQ('');
  }, [focus]);

  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`term-${focus}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focus, shown.length]);

  return (
    <div className="paper-grid flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 pt-14 pb-8 lg:px-6">
        <ModuleHeader module="glossary" title={t('glossary.title')} lead={t('glossary.lead')} />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('glossary.filter')}
              aria-label={t('glossary.filter')}
              data-testid="glossary-filter"
              className="h-10 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
          <span className="num text-xs text-muted-foreground">{t('glossary.count', { n: shown.length })}</span>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1" aria-label="A–Z">
          {letters.map((l) => (
            <a
              key={l}
              href={`#letter-${l}`}
              onClick={(e) => (
                e.preventDefault(),
                document.getElementById(`letter-${l}`)?.scrollIntoView({ behavior: 'smooth' })
              )}
              className="num rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {l}
            </a>
          ))}
        </nav>
      </div>
      <dl className="mx-auto mb-16 w-full max-w-5xl px-4 lg:px-6">
        {shown.length === 0 && <p className="text-sm text-muted-foreground">{t('glossary.noResults')}</p>}
        {shown.map((e, i) => {
          const letter = e.term[lang][0].toUpperCase();
          const first = i === 0 || shown[i - 1].term[lang][0].toUpperCase() !== letter;
          return (
            <div key={e.slug}>
              {first && (
                <p id={`letter-${letter}`} className="num mt-8 mb-2 scroll-mt-20 text-sm text-primary">
                  {letter}
                </p>
              )}
              <div
                id={`term-${e.slug}`}
                className={cn(
                  'grid scroll-mt-24 gap-x-8 gap-y-2 border-t border-border py-5 transition-colors sm:grid-cols-[14rem_1fr]',
                  focus === e.slug && 'bg-primary/5 ring-1 ring-primary/30',
                )}
                data-testid={`term-${e.slug}`}
              >
                <dt className="font-display text-xl tracking-tight">{bi(e.term)}</dt>
                <dd className="flex flex-col gap-3 text-[0.95rem] leading-relaxed">
                  <RichText text={bi(e.def)} exclude={e.slug} />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {e.see.length > 0 && (
                      <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
                        {t('glossary.seeAlso')}:
                        {e.see.map((s) => (
                          <Link
                            key={s}
                            to={`/glossary?t=${s}`}
                            className="text-foreground underline decoration-dotted underline-offset-4 hover:text-primary"
                          >
                            {bi(glossaryEntry(s)!.term)}
                          </Link>
                        ))}
                      </span>
                    )}
                    {e.module && (
                      <Link to={e.module} className="flex items-center gap-1 text-primary hover:underline">
                        {t('glossary.explore')} <ArrowUpRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
      <NextModule from="glossary" />
    </div>
  );
}
