import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight } from 'lucide-react';
import { MODULES } from './routes';

/** Editorial table-of-contents list of modules (not a grid of identical cards). */
export function ModuleIndex() {
  const { t } = useTranslation();
  return (
    <section id="modules" className="mx-auto w-full max-w-[1600px] px-4 pb-24 lg:px-6">
      <h2 className="mb-6 font-display text-3xl tracking-tight">{t('home.modulesTitle')}</h2>
      <ol className="border-t border-border">
        {MODULES.filter((m) => m.key !== 'intro').map((m) => (
          <li key={m.key} className="border-b border-border">
            <Link
              to={m.path}
              className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 gap-y-1 py-5 transition-colors hover:bg-card/60 sm:grid-cols-[4rem_16rem_1fr_auto] sm:px-2"
            >
              <span className="num text-sm text-muted-foreground group-hover:text-primary">{m.index}</span>
              <span className="font-display text-xl tracking-tight sm:text-2xl">{t(`nav.${m.key}`)}</span>
              <span className="col-span-2 col-start-2 row-start-2 text-sm text-muted-foreground sm:col-span-1 sm:col-start-3 sm:row-start-1">
                {t(`modules.${m.key}`)}
              </span>
              <ArrowUpRight className="col-start-3 row-start-1 size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary sm:col-start-4" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
