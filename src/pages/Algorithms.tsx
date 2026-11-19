import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { Badge } from '@/components/ui/badge';
import { ALGORITHMS } from '@/content/algorithms';
import { useBi } from '@/hooks/useBi';

export default function Algorithms() {
  const { t } = useTranslation();
  const bi = useBi();
  return (
    <div className="paper-grid flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1600px] px-4 pt-14 pb-10 lg:px-6">
        <ModuleHeader module="algorithms" title={t('algorithms.title')} lead={t('algorithms.lead')} />
      </div>
      <ol className="mx-auto mb-16 w-full max-w-[1600px] border-t border-border px-4 lg:px-6">
        {ALGORITHMS.map((a, i) => {
          const s = a.build(a.defaults);
          return (
            <li key={a.id} className="border-b border-border">
              <Link
                to={`/algorithms/${a.id}`}
                className="group grid gap-x-6 gap-y-2 py-6 transition-colors hover:bg-card/60 sm:grid-cols-[3rem_minmax(0,18rem)_minmax(0,1fr)_auto] sm:items-baseline sm:px-2"
                data-testid={`algo-${a.id}`}
              >
                <span className="num text-sm text-muted-foreground group-hover:text-primary">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-2xl tracking-tight">{bi(a.title)}</span>
                <span className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">{bi(a.summary)}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{t('algorithms.qubits', { n: s.qubits })}</Badge>
                    <Badge variant="outline">{t('algorithms.steps', { n: s.stages.length })}</Badge>
                    <Badge>{bi(a.speedup)}</Badge>
                  </span>
                </span>
                <ArrowUpRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary sm:block" />
              </Link>
            </li>
          );
        })}
      </ol>
      <NextModule from="algorithms" />
    </div>
  );
}
