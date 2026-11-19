import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SpookyCanvas } from '@/scene/SpookyCanvas';
import { CameraRig } from '@/scene/CameraRig';
import { StudioLights } from '@/scene/Lights';
import { AmplitudeCity, cityLayout, CITY_MAX_H } from '@/scene/composer/AmplitudeCity';
import { BlochGrid, blochGridRadius } from '@/scene/composer/BlochGrid';
import { RichText } from '@/ui/RichText';
import { getAlgorithm, stepText } from '@/content/algorithms';
import { stageColumnEnds, stagedToCircuit } from '@/lib/quantum/algorithms';
import { useSimulation } from '@/hooks/useSimulation';
import { normalizeGlobalPhase } from '@/lib/quantum/statevector';
import { useBi } from '@/hooks/useBi';
import { useComposer } from '@/store/composer';
import { prefersReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import NotFound from './NotFound';
import { GroverGeometry, PhaseWheels, ShorPanel } from './algorithms/vizPanels';
import { MiniCircuit } from './algorithms/MiniCircuit';

export default function AlgorithmDetail() {
  const { id = '' } = useParams();
  const algo = getAlgorithm(id);
  if (!algo) return <NotFound />;
  return <Walkthrough key={algo.id} id={algo.id} />;
}

function Walkthrough({ id }: { id: string }) {
  const algo = getAlgorithm(id)!;
  const { t } = useTranslation();
  const bi = useBi();
  const navigate = useNavigate();
  const [params, setParams] = useState<Record<string, number>>(algo.defaults);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const staged = useMemo(() => algo.build(params), [algo, params]);
  const circuit = useMemo(() => stagedToCircuit(staged), [staged]);
  const ends = useMemo(() => stageColumnEnds(staged), [staged]);
  const total = staged.stages.length;
  const { result } = useSimulation(circuit, 7);
  const col = step === 0 ? 0 : ends[step - 1];
  const snap = result?.snapshots[col] ?? null;
  const prevSnap = result && step > 0 ? result.snapshots[step === 1 ? 0 : ends[step - 2]] : undefined;
  // global phase is unobservable — fix it so the largest amplitude is real & positive (clearer colours)
  const amplitudes = useMemo(
    () => (snap ? normalizeGlobalPhase(snap.amplitudes) : new Float64Array(2 << staged.qubits).fill(0).fill(1, 0, 1)),
    [snap, staged.qubits],
  );
  const prevAmps = useMemo(() => (prevSnap ? normalizeGlobalPhase(prevSnap.amplitudes) : undefined), [prevSnap]);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => setStep((s) => (s >= total ? (setPlaying(false), s) : s + 1)), 2200);
    return () => clearInterval(h);
  }, [playing, total]);

  // micro-interaction: the step text slides in on change
  useGSAP(
    () => {
      if (prefersReducedMotion() || !textRef.current) return;
      gsap.fromTo(textRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
    },
    { dependencies: [step], scope: textRef },
  );

  const openInComposer = useCallback(() => {
    const upTo = step === 0 ? 1 : step;
    const c = stagedToCircuit(staged, upTo);
    useComposer.getState().setCircuit(c, { name: `${bi(algo.title)} · ${t('algorithms.stepN', { n: upTo })}` });
    useComposer.getState().setStep(null);
    void navigate('/composer');
  }, [staged, step, algo, bi, t, navigate]);

  const stage = step > 0 ? staged.stages[step - 1] : null;
  const st = stage ? stepText(algo, stage.key) : null;
  const iteration = stage?.key.includes('-') ? stage.key.split('-')[1] : null;
  const readout = algo.readout?.(params);
  const measuredBits = step === total && readout && snap ? readout.map((q) => snap.classical[q]).join('') : null;

  const n = staged.qubits;
  const useBloch = algo.viz === 'bloch';
  const fit = useBloch
    ? blochGridRadius(n)
    : (() => {
        const l = cityLayout(n);
        return Math.max(1.6, Math.hypot(l.width / 2, l.depth / 2, CITY_MAX_H / 2) + 0.35);
      })();

  // counting-register outcome for Shor
  const shorMeasured =
    algo.viz === 'shor' && step === total && snap
      ? [0, 1, 2, 3].reduce((acc, q) => (acc << 1) | Math.max(0, snap.classical[q]), 0)
      : null;
  const shorAmps =
    algo.viz === 'shor' && result ? result.snapshots[ends[Math.min(step, 4) - 1] ?? 0]?.amplitudes : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border px-4 py-6 lg:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
          <Link
            to="/algorithms"
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> {t('algorithms.allAlgorithms')}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-2xl flex-col gap-2">
              <h1 className="text-title">{bi(algo.title)}</h1>
              <p className="text-muted-foreground">{bi(algo.summary)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Badge>{bi(algo.speedup)}</Badge>
              {algo.params.map((p) => (
                <div key={p.key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{bi(p.label)}</span>
                  <ToggleGroup
                    type="single"
                    value={String(params[p.key])}
                    onValueChange={(v) => {
                      if (!v) return;
                      setParams((old) => ({ ...old, [p.key]: Number(v) }));
                      setStep(0);
                    }}
                    className="flex-wrap"
                  >
                    {p.options
                      .filter((o) => !(algo.id === 'grover' && p.key === 'marked' && o.value >= 1 << params.n))
                      .map((o) => (
                        <ToggleGroupItem key={o.value} value={String(o.value)} className="num">
                          {algo.id === 'grover' && p.key === 'marked' ? o.label.slice(-params.n) : o.label}
                        </ToggleGroupItem>
                      ))}
                  </ToggleGroup>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col">
          <div className="scene-surface relative h-[46dvh] min-h-[320px] lg:h-[58dvh]">
            <SpookyCanvas
              label={t('algorithms.sceneLabel')}
              className="h-full w-full"
              cameraPosition={useBloch ? [0, 0.6, 6] : [3.2, 3.0, 3.6]}
            >
              <StudioLights />
              {useBloch ? snap && <BlochGrid vectors={snap.bloch} /> : <AmplitudeCity n={n} amplitudes={amplitudes} />}
              <CameraRig
                fitRadius={fit}
                minDistance={1.5}
                maxDistance={18}
                target={useBloch ? [0, 0, 0] : [0, CITY_MAX_H / 2 - 0.9, 0]}
              />
            </SpookyCanvas>
          </div>
          <div className="border-t border-border px-4 py-4 lg:px-6">
            <h2 className="eyebrow mb-2">{t('algorithms.circuit')}</h2>
            <MiniCircuit
              circuit={circuit}
              from={step === 0 ? 0 : step === 1 ? 0 : ends[step - 2]}
              to={step === 0 ? 0 : ends[step - 1]}
              label={t('algorithms.circuit')}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-0 border-t border-border bg-card/70 lg:border-t-0 lg:border-l">
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-3">
            <span className="num text-xs text-muted-foreground" data-testid="algo-step">
              {step === 0 ? t('algorithms.intro') : `${t('algorithms.stepN', { n: step })} / ${total}`}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                aria-label={t('algorithms.prev')}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => (step >= total ? (setStep(0), setPlaying(true)) : setPlaying((p) => !p))}
                aria-label={t('algorithms.autoplay')}
              >
                {playing ? <Pause /> : <Play />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setStep((s) => Math.min(total, s + 1))}
                disabled={step === total}
                aria-label={t('algorithms.next')}
                data-testid="algo-next"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-5 px-5 py-5">
            <div ref={textRef} className="flex flex-col gap-3 text-[0.95rem] leading-relaxed">
              {step === 0 ? (
                <>
                  <h2 className="font-display text-2xl tracking-tight">{t('algorithms.intro')}</h2>
                  <RichText text={bi(algo.intro)} />
                </>
              ) : (
                st && (
                  <>
                    <h2 className="font-display text-2xl tracking-tight">
                      {bi(st.title)}
                      {iteration && (
                        <span className="num ml-2 align-middle text-sm text-muted-foreground">#{iteration}</span>
                      )}
                    </h2>
                    <RichText text={bi(st.body)} />
                  </>
                )
              )}
              {step === total && (
                <div className="mt-2 rounded-md border border-primary/40 bg-primary/5 p-3">
                  <p className="eyebrow mb-1.5">{t('algorithms.conclusion')}</p>
                  <RichText text={bi(algo.conclusion)} className="text-sm" />
                  {measuredBits && (
                    <p className="num mt-2 text-sm" data-testid="algo-result">
                      {t('algorithms.result')}: |{measuredBits}⟩
                    </p>
                  )}
                </div>
              )}
            </div>
            {algo.viz === 'grover' && snap && (
              <GroverGeometry
                n={params.n}
                marked={params.marked % (1 << params.n)}
                amplitudes={amplitudes}
                prevAmplitudes={prevAmps}
              />
            )}
            {algo.viz === 'qft' && snap && <PhaseWheels n={n} amplitudes={amplitudes} />}
            {algo.viz === 'shor' && step >= 4 && shorAmps && (
              <ShorPanel amplitudes={shorAmps} a={params.a} measured={shorMeasured} />
            )}
            <Button variant="outline" onClick={openInComposer} data-testid="open-in-composer">
              <Workflow /> {t('algorithms.openStep')}
            </Button>
            <ol className="flex flex-col border-t border-border pt-3">
              {staged.stages.map((s, i) => {
                const tx = stepText(algo, s.key);
                const it = s.key.includes('-') ? ` #${s.key.split('-')[1]}` : '';
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      onClick={() => setStep(i + 1)}
                      className={cn(
                        'flex w-full items-baseline gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary',
                        step === i + 1 && 'bg-secondary text-foreground',
                        step !== i + 1 && 'text-muted-foreground',
                      )}
                    >
                      <span className={cn('num text-xs', step >= i + 1 && 'text-primary')}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        {tx ? bi(tx.title) : s.key}
                        {it}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
