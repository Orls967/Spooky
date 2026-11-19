import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import type { ModuleKey } from '@/ui/routes';

/** Temporary page for modules that land in a later phase. */
export default function ModuleStub({ module }: { module: ModuleKey }) {
  const { t } = useTranslation();
  return (
    <div className="paper-grid flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-16 lg:px-6">
        <ModuleHeader module={module} lead={t(`modules.${module}`)}>
          <Badge variant="outline" className="w-fit">
            {t('common.comingNext')}
          </Badge>
        </ModuleHeader>
      </div>
      <NextModule from={module} />
    </div>
  );
}
