import { useTranslation } from 'react-i18next';

export function PageLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 items-center justify-center py-32" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex size-3 rounded-full bg-primary" />
        </span>
        {t('common.loading')}
      </div>
    </div>
  );
}
