import { useTranslation } from 'react-i18next';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { EntangledPair } from '@/scene/spooky/EntangledPair';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmbientDust } from '@/scene/AmbientDust';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { useSpookyLab, type Tab } from './spooky/useSpookyLab';
import { BellPanel, ChshPanel, EntropyPanel } from './spooky/panels';

export default function SpookyAction() {
  const { t } = useTranslation();
  const lab = useSpookyLab();
  return (
    <div className="flex flex-1 flex-col">
      <div className="grid shrink-0 lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[minmax(0,1fr)]">
        <div className="scene-surface relative h-[52dvh] min-h-[340px] lg:h-auto lg:min-h-0">
          <SpookyCanvas
            label={t('spooky.sceneLabel')}
            className="h-full w-full"
            cameraPosition={[0, 1.15, 5.6]}
            fov={40}
          >
            <StudioLights />
            <EntangledPair
              alice={lab.alice}
              bob={lab.bob}
              thread={lab.thread}
              axisA={lab.axisA}
              axisB={lab.axisB}
              names={[t('spooky.alice'), t('spooky.bob')]}
            />
            <AmbientDust spread={9} />
            <CameraRig minDistance={3.5} maxDistance={14} fitRadius={2.55} />
          </SpookyCanvas>
          <div className="pointer-events-none absolute inset-x-0 top-0 p-4 lg:p-6">
            <ModuleHeader
              module="spooky"
              title={t('spooky.title')}
              className="max-w-xl [&_h1]:text-[clamp(1.5rem,1rem+2vw,2.4rem)]"
            />
          </div>
        </div>
        <aside className="flex min-h-0 flex-col border-t border-border bg-card/70 lg:border-t-0 lg:border-l">
          <Tabs value={lab.tab} onValueChange={(v) => lab.setTab(v as Tab)} className="min-h-0 flex-1 gap-0">
            <TabsList className="shrink-0 px-3 pt-2">
              <TabsTrigger value="bell" data-testid="tab-bell">
                {t('spooky.tabBell')}
              </TabsTrigger>
              <TabsTrigger value="chsh" data-testid="tab-chsh">
                {t('spooky.tabChsh')}
              </TabsTrigger>
              <TabsTrigger value="entropy" data-testid="tab-entropy">
                {t('spooky.tabEntropy')}
              </TabsTrigger>
            </TabsList>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="border-b border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                {t('spooky.lead')}
              </p>
              <TabsContent value="bell">
                <BellPanel lab={lab} />
              </TabsContent>
              <TabsContent value="chsh">
                <ChshPanel lab={lab} />
              </TabsContent>
              <TabsContent value="entropy">
                <EntropyPanel lab={lab} />
              </TabsContent>
            </div>
          </Tabs>
        </aside>
      </div>
      <NextModule from="spooky" />
    </div>
  );
}
