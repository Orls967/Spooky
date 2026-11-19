import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from './Header';
import { SearchCommand } from './SearchCommand';
import { ErrorBoundary } from './ErrorBoundary';
import { PageError } from './PageError';
import { PageLoading } from './PageLoading';
import { ScrollToTop } from './ScrollToTop';

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        {t('nav.skip')}
      </a>
      <div className="flex min-h-dvh flex-col">
        <Header />
        <main id="main" className="flex flex-1 flex-col">
          <ErrorBoundary key={pathname} fallback={(e) => <PageError error={e} />}>
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
      <SearchCommand />
      <ScrollToTop />
    </TooltipProvider>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <p>{t('footer.note')}</p>
        <p className="font-display text-sm italic">{t('footer.quote')}</p>
      </div>
    </footer>
  );
}
