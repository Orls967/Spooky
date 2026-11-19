import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Histogram, HistogramLabels } from '@/ui/charts/Histogram';
import { PhaseWheel } from '@/ui/PhaseWheel';
import type { StepSnapshot } from '@/lib/quantum/engine';
import type { Circuit } from '@/lib/quantum/circuit';
import { basisLabel } from '@/lib/quantum/statevector';
import { fmtComplex, fmtPct } from '@/lib/format';
import { phaseCss } from '@/lib/color';
import { getSimClient } from '@/lib/sim-client';

export function StatePanel({
  snap,
  n,
  circuit,
  seed,
  inWorker,
}: {
  snap: StepSnapshot | null;
  n: number;
  circuit: Circuit;
  seed: number;
  inWorker: boolean;
}) {
  const { t } = useTranslation();
  const [shots, setShots] = useState<{ counts: Uint32Array; total: number } | null>(null);
  const top = useMemo(() => {
    if (!snap) return [];
    const idx = Array.from({ length: snap.probabilities.length }, (_, i) => i).filter(
      (i) => snap.probabilities[i] > 1e-9,
    );
    return idx.sort((a, b) => snap.probabilities[b] - snap.probabilities[a]).slice(0, 12);
  }, [snap]);

  const hist = useMemo(() => {
    if (!shots) return [];
    const idx = Array.from({ length: shots.counts.length }, (_, i) => i).filter((i) => shots.counts[i] > 0);
    return idx
      .sort((a, b) => shots.counts[b] - shots.counts[a])
      .slice(0, 8)
      .sort((a, b) => a - b)
      .map((i) => ({ label: basisLabel(i, n), value: shots.counts[i] }));
  }, [shots, n]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="eyebrow">{t('composer.amplitudes')}</h2>
          <PhaseWheel size={28} />
        </div>
        <ul className="flex flex-col gap-1" data-testid="amplitude-list">
          {top.map((i) => {
            const re = snap!.amplitudes[2 * i],
              im = snap!.amplitudes[2 * i + 1];
            const p = snap!.probabilities[i];
            return (
              <li key={i} className="grid grid-cols-[minmax(3.2rem,auto)_1fr_7.2rem_3.4rem] items-center gap-2">
                <span className="num text-xs">|{basisLabel(i, n)}⟩</span>
                <div className="relative h-3.5 overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="absolute inset-y-0 left-0 rounded-sm transition-[width] duration-500"
                    style={{ width: `${p * 100}%`, background: phaseCss(Math.atan2(im, re)) }}
                  />
                </div>
                <span className="num truncate text-right text-[0.65rem] text-muted-foreground">
                  {fmtComplex(re, im)}
                </span>
                <span className="num text-right text-[0.7rem]">{fmtPct(p)}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {snap && snap.classical.some((b) => b >= 0) && (
        <div className="flex flex-col gap-1.5">
          <h2 className="eyebrow">{t('composer.classicalBits')}</h2>
          <div className="flex flex-wrap gap-1">
            {snap.classical.map((b, q) => (
              <span key={q} className="num rounded-sm border border-border px-1.5 py-0.5 text-xs">
                c{q}={b < 0 ? '–' : b}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="eyebrow">{t('composer.shotsTitle')}</h2>
          <Button
            variant="outline"
            size="sm"
            data-testid="composer-shots"
            onClick={() =>
              void getSimClient().then((c) =>
                c.sampleShots(circuit, 1024, seed).then((counts) => setShots({ counts, total: 1024 })),
              )
            }
          >
            {t('composer.runShots', { n: 1024 })}
          </Button>
        </div>
        {shots && hist.length > 0 && (
          <>
            <Histogram data={hist} total={shots.total} ariaLabel={t('composer.shotsTitle')} height={110} />
            <HistogramLabels data={hist} total={shots.total} />
          </>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-[0.7rem] text-muted-foreground">
        <Cpu className="size-3.5" /> {inWorker ? t('composer.worker') : t('composer.mainThread')} · {t('common.seed')}{' '}
        {seed}
      </p>
    </div>
  );
}
