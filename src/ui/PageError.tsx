import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PageError({ error }: { error: Error }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-24">
      <p className="eyebrow">error</p>
      <h1 className="text-title">{t('errors.title')}</h1>
      <p className="text-muted-foreground">{t('errors.body')}</p>
      <pre className="num max-w-full overflow-auto rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        {error.message}
      </pre>
      <Button onClick={() => window.location.reload()}>
        <RotateCcw /> {t('errors.reload')}
      </Button>
    </div>
  );
}
