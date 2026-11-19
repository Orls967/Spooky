import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModuleIndex } from '@/ui/ModuleIndex';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="paper-grid flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 pt-20 pb-16 lg:px-6 lg:pt-28">
        <p className="eyebrow">{t('home.eyebrow')}</p>
        <h1 className="text-display max-w-[14ch] animate-rise">{t('home.title')}</h1>
        <p className="max-w-[58ch] text-lg leading-relaxed text-muted-foreground">{t('home.lead')}</p>
        <div className="flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/bloch">
              {t('home.start')} <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#modules">{t('home.explore')}</a>
          </Button>
        </div>
      </section>
      <ModuleIndex />
    </div>
  );
}
