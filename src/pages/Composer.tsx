import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { X } from 'lucide-react';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmplitudeCity, cityLayout, CITY_MAX_H } from '@/scene/composer/AmplitudeCity';
import { QSphere } from '@/scene/composer/QSphere';
import { BlochGrid, blochGridRadius } from '@/scene/composer/BlochGrid';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ModuleHeader } from '@/ui/ModuleHeader';
import { NextModule } from '@/ui/NextModule';
import { useComposer } from '@/store/composer';
import { useSimulation } from '@/hooks/useSimulation';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { decodeCircuitFromURL } from '@/lib/quantum/serialize';
import { countGates, circuitDepth } from '@/lib/quantum/circuit';
import { toast } from '@/store/toast';
import { PALETTE_BY_KEY, type PaletteItem } from './composer/palette';
import { Palette } from './composer/Palette';
import { CircuitGrid } from './composer/CircuitGrid';
import { Inspector } from './composer/Inspector';
import { Toolbar } from './composer/Toolbar';
import { StepControls } from './composer/StepControls';
import { StatePanel } from './composer/StatePanel';

/** Drop where the pointer is; fall back to the nearest cell (keyboard dragging). */
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

function lastUsedColumn(cols: unknown[][]): number {
  let k = cols.length;
  while (k > 0 && cols[k - 1].length === 0) k--;
  return k;
}

export default function Composer() {
  const { t } = useTranslation();
  const desktop = useIsDesktop();
  const circuit = useComposer((s) => s.circuit);
  const stepState = useComposer((s) => s.step);
  const view = useComposer((s) => s.view);
  const seed = useComposer((s) => s.seed);
  const inspecting = useComposer((s) => s.inspecting);
  const { place, move, setStep, setView, setCircuit, select } = useComposer.getState();
  const [armed, setArmed] = useState<PaletteItem | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  // load a shared circuit from ?c=
  useEffect(() => {
    const c = params.get('c');
    if (!c) return;
    const res = decodeCircuitFromURL(c);
    if (res.ok && res.value.qubits <= 8) {
      setCircuit(res.value, { name: '' });
      toast(t('composer.sharedLoaded'));
    } else if (!res.ok) toast(t('composer.loadError', { msg: res.error }), 'error');
    params.delete('c');
    setParams(params, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { result, inWorker } = useSimulation(circuit, seed);
  const used = lastUsedColumn(circuit.columns);
  const step = stepState === null ? used : Math.min(stepState, used);
  const snap =
    result && result.qubits === circuit.qubits
      ? (result.snapshots[Math.min(step, result.snapshots.length - 1)] ?? null)
      : null;

  const onStep = useCallback((s: number) => setStep(s >= used ? null : s), [setStep, used]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const d = e.active.data.current as { kind: string; key?: string } | undefined;
    setDragLabel(d?.kind === 'palette' && d.key ? PALETTE_BY_KEY[d.key].label : '•');
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDragLabel(null);
    const over = e.over?.data.current as { q: number; c: number } | undefined;
    const d = e.active.data.current as
      { kind: 'palette'; key: string } | { kind: 'op'; c: number; i: number } | undefined;
    if (!over || !d) return;
    if (d.kind === 'palette') {
      const op = PALETTE_BY_KEY[d.key].make(over.q, circuit.qubits);
      if (op) place(op, over.c);
      else toast(t('composer.invalidPlacement'), 'error');
    } else if (!move({ c: d.c, i: d.i }, over)) toast(t('composer.invalidPlacement'), 'error');
  };

  const onTapCell = useCallback(
    (q: number, c: number) => {
      if (!armed) {
        select(null);
        return;
      }
      const op = armed.make(q, circuit.qubits);
      if (op) place(op, c);
      else toast(t('composer.invalidPlacement'), 'error');
    },
    [armed, circuit.qubits, place, select, t],
  );

  const fit = useMemo(() => {
    if (view === 'bloch') return blochGridRadius(circuit.qubits);
    if (view === 'qsphere') return 1.9;
    const l = cityLayout(circuit.qubits);
    return Math.max(1.6, Math.hypot(l.width / 2, l.depth / 2, CITY_MAX_H / 2) + 0.35);
  }, [view, circuit.qubits]);

  const amplitudes = useMemo(
    () => snap?.amplitudes ?? new Float64Array(2 << circuit.qubits).fill(0).fill(1, 0, 1),
    [snap, circuit.qubits],
  );

  const scene = (
    <SpookyCanvas
      key={view}
      label={t('composer.sceneLabel')}
      className="h-full w-full"
      cameraPosition={view === 'bloch' ? [0, 0.6, 6] : view === 'qsphere' ? [2.6, 1.6, 3.6] : [3.2, 3.0, 3.6]}
      fov={38}
    >
      <StudioLights />
      {view === 'city' && <AmplitudeCity n={circuit.qubits} amplitudes={amplitudes} />}
      {view === 'qsphere' && <QSphere n={circuit.qubits} amplitudes={amplitudes} />}
      {view === 'bloch' && snap && <BlochGrid vectors={snap.bloch} />}
      <CameraRig
        fitRadius={fit}
        minDistance={1.5}
        maxDistance={16}
        target={view === 'city' ? [0, CITY_MAX_H / 2 - 0.9, 0] : [0, 0, 0]}
      />
    </SpookyCanvas>
  );

  const hint =
    view === 'city' ? t('composer.cityHint') : view === 'qsphere' ? t('composer.qsphereHint') : t('composer.blochHint');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      autoScroll={{ threshold: { x: 0.15, y: 0.04 }, acceleration: 6 }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragLabel(null)}
    >
      <div className="flex flex-1 flex-col">
        <div className="grid shrink-0 lg:h-[54dvh] lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[minmax(0,1fr)]">
          <div className="scene-surface relative h-[44dvh] min-h-[300px] lg:h-auto lg:min-h-0">
            {scene}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 lg:p-5">
              <ModuleHeader
                module="composer"
                title={t('composer.title')}
                className="max-w-md [&_h1]:text-[clamp(1.35rem,1rem+1.5vw,2rem)]"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3 lg:p-4">
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(v) => v && setView(v as typeof view)}
                className="bg-card/90 backdrop-blur"
                aria-label="view"
              >
                <ToggleGroupItem value="city" data-testid="view-city">
                  {t('composer.viewCity')}
                </ToggleGroupItem>
                <ToggleGroupItem value="qsphere" data-testid="view-qsphere">
                  {t('composer.viewQsphere')}
                </ToggleGroupItem>
                <ToggleGroupItem value="bloch" data-testid="view-bloch">
                  {t('composer.viewBloch')}
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="max-w-xs rounded-md bg-background/70 px-2 py-1 text-[0.7rem] text-muted-foreground backdrop-blur">
                {hint}
              </p>
            </div>
          </div>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card/70 p-5 lg:block">
            <StatePanel snap={snap} n={circuit.qubits} circuit={circuit} seed={seed} inWorker={inWorker} />
          </aside>
        </div>

        <section className="flex flex-col gap-4 border-t border-border bg-background px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Toolbar />
            <span className="num text-xs text-muted-foreground">
              {t('composer.gates', { n: countGates(circuit) })} · {t('composer.depth', { n: circuitDepth(circuit) })}
            </span>
          </div>
          <Palette armedKey={armed?.key ?? null} onArm={(it) => setArmed((a) => (a?.key === it.key ? null : it))} />
          {armed && (
            <div
              className="flex items-center gap-2 self-start rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary"
              role="status"
            >
              {t('composer.armed', { gate: armed.label })}
              <Button variant="ghost" size="icon-sm" onClick={() => setArmed(null)} aria-label={t('composer.cancel')}>
                <X />
              </Button>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="panel flex min-w-0 flex-col gap-2 p-3">
              <CircuitGrid circuit={circuit} step={step} onTapCell={onTapCell} onStep={onStep} store={useComposer} />
              {used === 0 && <p className="px-1 text-xs text-muted-foreground">{t('composer.emptyCircuit')}</p>}
              <StepControls step={step} total={used} onStep={onStep} />
            </div>
            {desktop ? (
              <div className="panel p-4">
                <h2 className="eyebrow mb-3">{t('composer.inspector')}</h2>
                <Inspector store={useComposer} />
              </div>
            ) : (
              <>
                <div className="panel p-4">
                  <StatePanel snap={snap} n={circuit.qubits} circuit={circuit} seed={seed} inWorker={inWorker} />
                </div>
                <Sheet open={inspecting} onOpenChange={(o) => !o && select(null)}>
                  <SheetContent side="bottom" className="gap-0 p-0">
                    <SheetHeader>
                      <SheetTitle>{t('composer.inspector')}</SheetTitle>
                      <SheetDescription className="sr-only">{t('composer.noSelection')}</SheetDescription>
                    </SheetHeader>
                    <div className="max-h-[65dvh] overflow-y-auto p-5">
                      <Inspector store={useComposer} />
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </section>
        <NextModule from="composer" />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragLabel && (
          <div className="flex h-10 min-w-10 items-center justify-center rounded-[5px] border border-primary bg-card px-2 font-mono text-sm font-semibold text-primary shadow-lg">
            {dragLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
