import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MODULES, type ModuleKey } from './routes';
import { cn } from '@/lib/utils';

export function ModuleHeader({
  module,
  title,
  lead,
  children,
  className,
}: {
  module: ModuleKey;
  title?: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation();
  const m = MODULES.find((x) => x.key === module);
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="eyebrow flex items-center gap-2">
        <span className="text-primary">{m?.index}</span>
        <span className="h-px w-6 bg-border" />
        {t(`nav.${module}`)}
      </p>
      <h1 className="text-title max-w-[22ch]">{title ?? t(`nav.${module}`)}</h1>
      {lead !== undefined && (
        <p className="max-w-[62ch] text-[0.975rem] leading-relaxed text-muted-foreground">{lead}</p>
      )}
      {children}
    </div>
  );
}
