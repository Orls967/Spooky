import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { nextModule, type ModuleKey } from './routes';

/** Contextual "continue to" link that strings the modules together. */
export function NextModule({ from }: { from: ModuleKey }) {
  const { t } = useTranslation();
  const next = nextModule(from);
  if (!next) return null;
  return (
    <Link
      to={next.path}
      className="group mt-auto flex items-center justify-between gap-6 border-t border-border px-4 py-8 transition-colors hover:bg-secondary/50 lg:px-6"
    >
      <span className="flex flex-col gap-1">
        <span className="eyebrow">
          {t('common.continueTo')} · {next.index}
        </span>
        <span className="font-display text-2xl tracking-tight">{t(`nav.${next.key}`)}</span>
        <span className="max-w-[60ch] text-sm text-muted-foreground">{t(`modules.${next.key}`)}</span>
      </span>
      <ArrowRight className="size-6 shrink-0 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}
