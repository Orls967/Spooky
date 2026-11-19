import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowLeft, ArrowRight, Lightbulb, RotateCcw, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmplitudeCity, cityLayout, CITY_MAX_H } from '@/scene/composer/AmplitudeCity';
import { BlochSphere } from '@/scene/bloch/BlochSphere';
import { BlochAnimator } from '@/scene/bloch/BlochAnimator';
import { TargetMarker } from '@/scene/bloch/TargetMarker';
import { Tex } from '@/ui/Tex';
import { getPuzzle, PUZZLES } from '@/content/puzzles';
import { evaluate, targetState } from '@/lib/puzzle';
import { runCircuit } from '@/lib/quantum/circuit';
import { blochOfQubit } from '@/lib/quantum/bloch';
import { basisLabel, normalizeGlobalPhase } from '@/lib/quantum/statevector';
import { phaseCss } from '@/lib/color';
import { fmt, fmtPct } from '@/lib/format';
import { createCircuitStore } from '@/store/composer';
import { isUnlocked, useProgress } from '@/store/progress';
import { useBi } from '@/hooks/useBi';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';
import { PALETTE, PALETTE_BY_KEY, type PaletteItem } from './composer/palette';
import { Palette } from './composer/Palette';
import { CircuitGrid } from './composer/CircuitGrid';
import { Inspector } from './composer/Inspector';
import { Stars } from './Puzzles';

const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length ? hits : closestCenter(args);
};

export default function PuzzleBoard() {
  const { id } = useParams();
  const level = getPuzzle(Number(id));
  const stars = useProgress((s) => s.stars);
  if (!level) return <NotFound />;
  if (!isUnlocked(stars, level.id)) return <Locked />;
  return <Board key={level.id} levelId={level.id} />;
}

function Locked() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-1 flex-col items-start gap-4 px-6 py-24">
      <p>{t('puzzles.locked')}</p>
      <Button asChild variant="outline">
        <Link to="/puzzles">{t('puzzles.backToMap')}</Link>
      </Button>
    </div>
  );
}

function Bars({ amps, n, label }: { amps: Float64Array; n: number; label: string }) {
  const N = 1 << n;
  return (
    <div className="grid gap-1" aria-label={label} role="img">
      {Array.from({ length: N }, (_, i) => {
        const re = amps[2 * i],
          im = amps[2 * i + 1];
        const p = re * re + im * im;
        return (
          <div key={i} className="grid grid-cols-[3.2rem_1fr_3rem] items-center gap-2">
            <span className="num text-[0.7rem]">|{basisLabel(i, n)}⟩</span>
            <div className="relative h-2.5 overflow-hidden rounded-sm bg-secondary">
              <div
                className="absolute inset-y-0 left-0 rounded-sm transition-[width,background-color] duration-500"
                style={{ width: `${p * 100}%`, background: p > 1e-6 ? phaseCss(Math.atan2(im, re)) : 'transparent' }}
              />
            </div>
            <span className="num text-right text-[0.65rem] text-muted-foreground">{fmtPct(p, 0)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Board({ levelId }: { levelId: number }) {
  const level = getPuzzle(levelId)!;
  const { t } = useTranslation();
  const bi = useBi();
  const navigate = useNavigate();
  const desktop = useIsDesktop();
  const store = useMemo(() => createCircuitStore(level.qubits), [level.qubits]);
  const circuit = store((s) => s.circuit);
  const inspecting = store((s) => s.inspecting);
  const past = store((s) => s.past.length);
  const record = useProgress((s) => s.record);
  const [armed, setArmed] = useState<PaletteItem | null>(null);
  const [showHint, setShowHint] = useState(false);
  const items = useMemo(() => PALETTE.filter((p) => level.allowed.includes(p.key)), [level.allowed]);
  const target = useMemo(() => targetState(level), [level]);
  const targetAmps = useMemo(() => normalizeGlobalPhase(target.data), [target]);
  const targetBloch = useMemo(() => (level.qubits === 1 ? blochOfQubit(target, 0) : null), [target, level.qubits]);
  const state = useMemo(() => runCircuit(circuit).state, [circuit]);
  const curAmps = useMemo(() => normalizeGlobalPhase(state.data), [state]);
  const ev = useMemo(() => evaluate(level, circuit, target), [level, circuit, target]);
  const animator = useMemo(() => new BlochAnimator([0, 0, 1]), []);
  const banner = useRef<HTMLDivElement>(null);
  const nextId = PUZZLES.find((p) => p.id === level.id + 1)?.id;

  useEffect(() => () => animator.dispose(), [animator]);
  useEffect(() => {
    if (level.qubits === 1) animator.moveTo(blochOfQubit(state, 0), 0.55);
  }, [state, level.qubits, animator]);
  useEffect(() => {
    if (ev.solved) record(level.id, ev.stars);
  }, [ev.solved, ev.stars, level.id, record]);

  useGSAP(
    () => {
      if (!ev.solved || !banner.current || prefersReducedMotion()) return;
      gsap.fromTo(
        banner.current,
        { y: 16, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' },
      );
      gsap.fromTo(
        banner.current.querySelectorAll('svg.lucide-star'),
        { scale: 0, rotate: -40 },
        { scale: 1, rotate: 0, stagger: 0.12, duration: 0.5, ease: 'back.out(2.5)', delay: 0.15 },
      );
    },
    { dependencies: [ev.solved] },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const over = e.over?.data.current as { q: number; c: number } | undefined;
    const d = e.active.data.current as
      { kind: 'palette'; key: string } | { kind: 'op'; c: number; i: number } | undefined;
    if (!over || !d) return;
    if (d.kind === 'palette') {
      const op = PALETTE_BY_KEY[d.key].make(over.q, level.qubits);
      if (op) store.getState().place(op, over.c);
    } else store.getState().move({ c: d.c, i: d.i }, over);
  };
  const onTapCell = (q: number, c: number) => {
    if (!armed) return store.getState().select(null);
    const op = armed.make(q, level.qubits);
    if (op) store.getState().place(op, c);
  };

  let used = circuit.columns.length;
  while (used > 0 && circuit.columns[used - 1].length === 0) used--;

  const fit =
    level.qubits === 1
      ? 1.55
      : Math.max(
          1.6,
          Math.hypot(cityLayout(level.qubits).width / 2, cityLayout(level.qubits).depth / 2, CITY_MAX_H / 2) + 0.35,
        );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragEnd={onDragEnd}
      autoScroll={{ threshold: { x: 0.15, y: 0.04 } }}
    >
      <div className="flex flex-1 flex-col">
        <div className="border-b border-border px-4 py-5 lg:px-6">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Link
                to="/puzzles"
                className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> {t('puzzles.backToMap')}
              </Link>
              <p className="eyebrow">
                <span className="text-primary">{t('puzzles.level', { n: level.id })}</span>
              </p>
              <h1 className="font-display text-3xl tracking-tight">{bi(level.title)}</h1>
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <span className="text-xs text-muted-foreground">
                {t('puzzles.parInfo', { par: level.par, depth: level.parDepth })}
              </span>
              <span className="num text-sm" data-testid="puzzle-stats">
                {t('puzzles.stats', { g: ev.gates, d: ev.depth })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-5 border-b border-border bg-card/70 p-5 lg:border-r lg:border-b-0">
            <div className="flex flex-col gap-2">
              <h2 className="eyebrow">{t('puzzles.target')}</h2>
              <div
                className="rounded-md border border-border bg-background/60 px-3 py-3 text-lg"
                data-testid="puzzle-target"
              >
                <Tex math={level.targetTex} display />
              </div>
              <Bars amps={targetAmps} n={level.qubits} label={t('puzzles.target')} />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="eyebrow">{t('puzzles.current')}</h2>
              <Bars amps={curAmps} n={level.qubits} label={t('puzzles.current')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm">{t('puzzles.fidelity')}</span>
                <span className={cn('num text-lg', ev.solved && 'text-primary')} data-testid="fidelity">
                  {fmt(ev.fidelity, 4)}
                </span>
              </div>
              <div className="relative h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${ev.fidelity * 100}%` }}
                />
                <div className="absolute inset-y-0 w-px bg-foreground" style={{ left: '99.9%' }} />
              </div>
              <span className="text-right text-[0.65rem] text-muted-foreground">{t('puzzles.threshold')}</span>
            </div>
            <div>
              <Button variant="ghost" size="sm" onClick={() => setShowHint((v) => !v)} aria-expanded={showHint}>
                <Lightbulb /> {t('puzzles.hint')}
              </Button>
              {showHint && (
                <p className="mt-1 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {bi(level.hint)}
                </p>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-col">
            <div className="scene-surface relative h-[36dvh] min-h-[260px]">
              <SpookyCanvas
                label={t('puzzles.sceneLabel')}
                className="h-full w-full"
                cameraPosition={level.qubits === 1 ? [3.9, 1.7, -1.35] : [3.2, 3.0, 3.6]}
              >
                <StudioLights />
                {level.qubits === 1 ? (
                  <BlochSphere animator={animator} floor={false}>
                    {targetBloch && <TargetMarker v={targetBloch} />}
                  </BlochSphere>
                ) : (
                  <AmplitudeCity n={level.qubits} amplitudes={curAmps} ghost={targetAmps} />
                )}
                <CameraRig
                  fitRadius={fit}
                  minDistance={1.5}
                  maxDistance={14}
                  target={level.qubits === 1 ? [0, 0, 0] : [0, CITY_MAX_H / 2 - 0.9, 0]}
                />
              </SpookyCanvas>
            </div>

            <div className="flex flex-col gap-4 p-4 lg:p-6">
              {ev.solved && (
                <div
                  ref={banner}
                  className="panel flex flex-wrap items-center justify-between gap-4 border-primary/50 p-4"
                  role="status"
                  data-testid="puzzle-solved"
                >
                  <div className="flex flex-col gap-1">
                    <p className="flex items-center gap-3 font-display text-2xl">
                      {t('puzzles.solved')} <Stars n={ev.stars} className="[&_svg]:size-5" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('puzzles.solvedBody', { f: fmt(ev.fidelity, 4), stars: ev.stars })}{' '}
                      {ev.stars < 3 && t('puzzles.tryFewer')}
                    </p>
                  </div>
                  {nextId ? (
                    <Button onClick={() => void navigate(`/puzzles/${nextId}`)} data-testid="next-level">
                      {t('puzzles.nextLevel')} <ArrowRight />
                    </Button>
                  ) : (
                    <p className="text-sm">{t('puzzles.allDone')}</p>
                  )}
                </div>
              )}
              {ev.illegal.length > 0 && (
                <p className="text-sm text-destructive">{t('puzzles.illegal', { g: ev.illegal.join(', ') })}</p>
              )}
              <div className="flex flex-wrap items-end justify-between gap-3">
                <Palette
                  items={items}
                  title={t('puzzles.allowed')}
                  armedKey={armed?.key ?? null}
                  onArm={(it) => setArmed((a) => (a?.key === it.key ? null : it))}
                />
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => store.getState().undo()} disabled={!past}>
                    <Undo2 /> {t('composer.undo')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => store.getState().clear()}>
                    <RotateCcw /> {t('puzzles.reset')}
                  </Button>
                </div>
              </div>
              {armed && (
                <div
                  className="flex items-center gap-2 self-start rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm text-primary"
                  role="status"
                >
                  {t('composer.armed', { gate: armed.label })}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setArmed(null)}
                    aria-label={t('composer.cancel')}
                  >
                    <X />
                  </Button>
                </div>
              )}
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="panel min-w-0 p-3">
                  <CircuitGrid
                    circuit={circuit}
                    step={used}
                    onTapCell={onTapCell}
                    onStep={() => undefined}
                    store={store}
                  />
                </div>
                {desktop ? (
                  <div className="panel p-4">
                    <h2 className="eyebrow mb-3">{t('composer.inspector')}</h2>
                    <Inspector store={store} allowed={level.allowed} />
                  </div>
                ) : (
                  <Sheet open={inspecting} onOpenChange={(o) => !o && store.getState().select(null)}>
                    <SheetContent side="bottom" className="gap-0 p-0">
                      <SheetHeader>
                        <SheetTitle>{t('composer.inspector')}</SheetTitle>
                        <SheetDescription className="sr-only">{t('composer.noSelection')}</SheetDescription>
                      </SheetHeader>
                      <div className="max-h-[65dvh] overflow-y-auto p-5">
                        <Inspector store={store} allowed={level.allowed} />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DndContext>
  );
}
