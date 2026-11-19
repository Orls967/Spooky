import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Lock, Star } from 'lucide-react';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { Button } from '@/components/ui/button';
import { CHAPTERS, PUZZLES } from '@/content/puzzles';
import { isUnlocked, useProgress } from '@/store/progress';
import { useBi } from '@/hooks/useBi';
import { Tex } from '@/ui/Tex';
import { cn } from '@/lib/utils';

export function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-label={`${n}/3`}>
      {[1, 2, 3].map((k) => (
        <Star key={k} className={cn('size-3.5', k <= n ? 'fill-primary text-primary' : 'text-border')} />
      ))}
    </span>
  );
}

export default function Puzzles() {
  const { t } = useTranslation();
  const bi = useBi();
  const stars = useProgress((s) => s.stars);
  const reset = useProgress((s) => s.reset);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  return (
    <div className="paper-grid flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 pt-14 pb-8 lg:px-6">
        <ModuleHeader module="puzzles" title={t('puzzles.title')} lead={t('puzzles.lead')} />
        <div className="flex items-center gap-3">
          <span className="num text-sm" data-testid="star-total">
            {t('puzzles.progress', { s: total, max: PUZZLES.length * 3 })}
          </span>
          {total > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              {t('puzzles.resetProgress')}
            </Button>
          )}
        </div>
      </div>
      <div className="mx-auto mb-16 flex w-full max-w-[1600px] flex-col gap-10 px-4 lg:px-6">
        {([1, 2, 3] as const).map((ch) => (
          <section key={ch} className="flex flex-col gap-3">
            <h2 className="flex items-baseline gap-3 font-display text-2xl tracking-tight">
              <span className="num text-sm text-primary">0{ch}</span>
              {bi(CHAPTERS[ch])}
            </h2>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
              {PUZZLES.filter((p) => p.chapter === ch).map((p) => {
                const open = isUnlocked(stars, p.id);
                const s = stars[p.id] ?? 0;
                const body = (
                  <>
                    <span className="flex items-center justify-between">
                      <span className="num text-xs text-muted-foreground">{String(p.id).padStart(2, '0')}</span>
                      {open ? <Stars n={s} /> : <Lock className="size-3.5 text-muted-foreground" />}
                    </span>
                    <span className="font-medium leading-tight">{bi(p.title)}</span>
                    <span className="mt-auto overflow-hidden text-xs text-muted-foreground">
                      <Tex math={p.targetTex} />
                    </span>
                  </>
                );
                return (
                  <li key={p.id} className="overflow-hidden rounded-md border border-border bg-card">
                    {open ? (
                      <Link
                        to={`/puzzles/${p.id}`}
                        className="flex h-full min-h-32 flex-col gap-2 p-3 transition-colors hover:bg-secondary"
                        data-testid={`level-${p.id}`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        className="flex h-full min-h-32 flex-col gap-2 p-3 opacity-50"
                        title={t('puzzles.locked')}
                        aria-disabled
                      >
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
      <NextModule from="puzzles" />
    </div>
  );
}
