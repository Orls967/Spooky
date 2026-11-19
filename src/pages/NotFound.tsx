import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="paper-grid flex flex-1 items-center">
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-5 px-6 py-24">
        <p className="eyebrow num">⟨404|ψ⟩ = 0</p>
        <h1 className="text-title">{t('notFound.title')}</h1>
        <p className="text-muted-foreground">{t('notFound.body')}</p>
        <Button asChild>
          <Link to="/">{t('notFound.home')}</Link>
        </Button>
      </div>
    </div>
  );
}
