import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { BlochSphere } from '@/scene/bloch/BlochSphere';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmbientDust } from '@/scene/AmbientDust';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { useBlochLab } from './bloch/useBlochLab';
import { DirectState, GateButton, GatePad, HistoryStrip, MeasurePanel, NoisePanel, StateReadout } from './bloch/panels';

export default function BlochStudio() {
  const { t } = useTranslation();
  const lab = useBlochLab();
  const desktop = useIsDesktop();

  const scene = (
    <SpookyCanvas label={t('bloch.sceneLabel')} className="h-full w-full" dof>
      <StudioLights />
      <BlochSphere animator={lab.animator} mixedness={lab.mixedness} />
      <AmbientDust />
      <CameraRig />
    </SpookyCanvas>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid shrink-0 lg:h-[calc(100dvh-3.5rem)] lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[minmax(0,1fr)]">
        <div className="scene-surface relative h-[56dvh] min-h-[360px] lg:h-auto lg:min-h-0">
          {scene}
          <div className="pointer-events-none absolute inset-x-0 top-0 p-4 lg:p-6">
            <ModuleHeader
              module="bloch"
              title={t('bloch.title')}
              className="pointer-events-auto max-w-xl [&_h1]:text-[clamp(1.5rem,1rem+2vw,2.4rem)]"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 lg:p-5">
            <HistoryStrip
              lab={lab}
              className="rounded-md border border-border bg-background/75 px-2 py-1 backdrop-blur"
            />
          </div>
        </div>

        {desktop ? (
          <aside className="flex min-h-0 flex-col border-l border-border bg-card/70">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <p className="border-b border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                {t('bloch.lead')}
              </p>
              <StateReadout lab={lab} />
              <GatePad lab={lab} />
              <DirectState lab={lab} />
              <MeasurePanel lab={lab} />
              <NoisePanel lab={lab} />
            </div>
          </aside>
        ) : (
          <MobileControls lab={lab} />
        )}
      </div>
      <NextModule from="bloch" />
    </div>
  );
}

function MobileControls({ lab }: { lab: ReturnType<typeof useBlochLab> }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-card/70 p-4">
      <p className="text-sm leading-relaxed text-muted-foreground">{t('bloch.lead')}</p>
      <div className="grid grid-cols-6 gap-1.5">
        {(['X', 'Y', 'Z', 'H', 'S', 'T'] as const).map((g) => (
          <GateButton key={g} id={g} size="sm" onApply={() => lab.applyGate(g)} />
        ))}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={lab.measure}>
          {t('bloch.measureOnce')}
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1" data-testid="open-panel">
              <SlidersHorizontal /> {t('bloch.openPanel')}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="gap-0 p-0">
            <SheetHeader className="pb-2">
              <SheetTitle>{t('nav.bloch')}</SheetTitle>
              <SheetDescription className="sr-only">{t('bloch.lead')}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="state" className="min-h-0 gap-0">
              <TabsList className="px-3">
                <TabsTrigger value="state">{t('bloch.tabState')}</TabsTrigger>
                <TabsTrigger value="gates">{t('bloch.tabGates')}</TabsTrigger>
                <TabsTrigger value="measure">{t('bloch.tabMeasure')}</TabsTrigger>
                <TabsTrigger value="noise">{t('bloch.tabNoise')}</TabsTrigger>
              </TabsList>
              <div className="max-h-[62dvh] overflow-y-auto">
                <TabsContent value="state">
                  <StateReadout lab={lab} />
                </TabsContent>
                <TabsContent value="gates">
                  <GatePad lab={lab} />
                  <DirectState lab={lab} />
                </TabsContent>
                <TabsContent value="measure">
                  <MeasurePanel lab={lab} />
                </TabsContent>
                <TabsContent value="noise">
                  <NoisePanel lab={lab} />
                </TabsContent>
              </div>
            </Tabs>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
