import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCcw, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tex } from '@/ui/Tex';
import { LineChart } from '@/ui/charts/LineChart';
import { Section } from '@/pages/bloch/panels';
import { CLASSICAL_BOUND, OPTIMAL_STRATEGY, TSIRELSON_WIN } from '@/lib/quantum/chsh';
import { reducedEntropy } from '@/lib/quantum/entanglement';
import type { BellKind } from '@/lib/quantum/algorithms';
import { fmt, fmtPct, piText } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Basis, SpookyLab } from './useSpookyLab';

const BELL_TEX: Record<BellKind, { name: string; ket: string }> = {
  'phi+': { name: '\\Phi^+', ket: '\\tfrac{1}{\\sqrt2}\\left(|00\\rangle + |11\\rangle\\right)' },
  'phi-': { name: '\\Phi^-', ket: '\\tfrac{1}{\\sqrt2}\\left(|00\\rangle - |11\\rangle\\right)' },
  'psi+': { name: '\\Psi^+', ket: '\\tfrac{1}{\\sqrt2}\\left(|01\\rangle + |10\\rangle\\right)' },
  'psi-': { name: '\\Psi^-', ket: '\\tfrac{1}{\\sqrt2}\\left(|01\\rangle - |10\\rangle\\right)' },
};

function Stat({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
  testId?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-border px-2.5 py-2" data-testid={testId}>
      <span className="text-[0.7rem] text-muted-foreground">{label}</span>
      <span className={cn('num text-base', tone === 'good' && 'text-primary', tone === 'bad' && 'text-destructive')}>
        {value}
      </span>
    </div>
  );
}

function BasisToggle({ value, onChange, label }: { value: Basis; onChange: (b: Basis) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v as Basis)} aria-label={label}>
        <ToggleGroupItem value="Z" className="num">
          Z
        </ToggleGroupItem>
        <ToggleGroupItem value="X" className="num">
          X
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

export function BellPanel({ lab }: { lab: SpookyLab }) {
  const { t } = useTranslation();
  const outcome = (v: 0 | 1 | null) => (v === null ? t('spooky.notMeasured') : `|${v}⟩`);
  const E = lab.corr
    ? (lab.corr.counts[0] + lab.corr.counts[3] - lab.corr.counts[1] - lab.corr.counts[2]) / lab.corr.total
    : null;
  return (
    <>
      <Section title={t('spooky.bellState')}>
        <ToggleGroup
          type="single"
          value={lab.kind}
          onValueChange={(v) => v && lab.chooseKind(v as BellKind)}
          className="w-full"
        >
          {(Object.keys(BELL_TEX) as BellKind[]).map((k) => (
            <ToggleGroupItem key={k} value={k} className="flex-1" aria-label={k}>
              <Tex math={`|${BELL_TEX[k].name}\\rangle`} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="rounded-md border border-border bg-background/60 px-3 py-3" data-testid="bell-state">
          <Tex math={`|${BELL_TEX[lab.kind].name}\\rangle = ${BELL_TEX[lab.kind].ket}`} display />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('spooky.localNote')}</p>
      </Section>
      <Section title={t('spooky.basis')}>
        <BasisToggle value={lab.basisA} onChange={lab.setBasisA} label={t('spooky.basisA')} />
        <BasisToggle value={lab.basisB} onChange={lab.setBasisB} label={t('spooky.basisB')} />
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => lab.measure(0)} disabled={lab.measured[0] !== null} data-testid="measure-alice">
            {t('spooky.measureA')}
          </Button>
          <Button variant="outline" onClick={() => lab.measure(1)} disabled={lab.measured[1] !== null}>
            {t('spooky.measureB')}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2" aria-live="polite">
          <span className="num rounded-md border border-border px-2 py-1.5 text-sm" data-testid="result-alice">
            {t('spooky.resultA', { v: outcome(lab.measured[0]) })}
          </span>
          <span className="num rounded-md border border-border px-2 py-1.5 text-sm" data-testid="result-bob">
            {t('spooky.resultB', { v: outcome(lab.measured[1]) })}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => lab.prepare()} className="self-start">
          <RefreshCcw /> {t('spooky.newPair')}
        </Button>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('spooky.noSignal')}</p>
      </Section>
      <Section title={t('spooky.correlations', { n: lab.corr?.total ?? 1000 })}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => lab.runCorrelations(1000)}
          className="self-start"
          data-testid="run-corr"
        >
          {t('spooky.runCorrelations', { n: 1000 })}
        </Button>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-xs">
          <span />
          <span className="num text-muted-foreground">B=0</span>
          <span className="num text-muted-foreground">B=1</span>
          {[0, 1].map((a) => (
            <div key={a} className="contents">
              <span className="num self-center pr-1 text-muted-foreground">A={a}</span>
              {[0, 1].map((b) => {
                const v = lab.corr?.counts[2 * a + b] ?? 0;
                const share = lab.corr ? v / lab.corr.total : 0;
                return (
                  <div
                    key={b}
                    className="num rounded-sm border border-border py-2.5 transition-colors"
                    style={{
                      background: `color-mix(in oklch, var(--primary) ${Math.round(share * 140)}%, transparent)`,
                    }}
                  >
                    {lab.corr ? v : '—'}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {E !== null && <Stat label={t('spooky.correlator')} value={fmt(E)} />}
      </Section>
      <NoiseSection lab={lab} />
    </>
  );
}

function NoiseSection({ lab }: { lab: SpookyLab }) {
  const { t } = useTranslation();
  return (
    <Section title={t('spooky.noise')}>
      <p className="text-xs text-muted-foreground">{t('spooky.noiseHint')}</p>
      <div className="flex items-center gap-3">
        <span className="num w-6 text-sm">p</span>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round(lab.noise * 100)]}
          onValueChange={([v]) => lab.setNoise(v / 100)}
          aria-label={t('spooky.noise')}
        />
        <span className="num w-10 text-right text-sm">{lab.noise.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label={t('spooky.concurrence')} value={fmt(lab.concurrence)} />
        <Stat label={t('spooky.purity')} value={fmt(lab.rho.purity())} />
      </div>
    </Section>
  );
}

const ANGLE_KEYS = ['a0', 'a1', 'b0', 'b1'] as const;

export function ChshPanel({ lab }: { lab: SpookyLab }) {
  const { t } = useTranslation();
  const r = lab.lastRound;
  const rate = lab.run ? lab.run.rounds.filter((x) => x.win).length / lab.run.rounds.length : null;
  const series = useMemo(
    () => (lab.run ? [{ points: lab.run.series.map((p) => ({ x: p.n, y: p.rate })), color: 'var(--primary)' }] : []),
    [lab.run],
  );
  return (
    <>
      <Section title={t('spooky.chshTitle')}>
        <p className="text-sm leading-relaxed">{t('spooky.chshRules')}</p>
        <Tex math="a \oplus b = x \wedge y" display />
        <p className="text-xs leading-relaxed text-muted-foreground">{t('spooky.chshRules2')}</p>
      </Section>
      <Section title={t('spooky.strategy')}>
        <ToggleGroup
          type="single"
          value={lab.mode}
          onValueChange={(v) => v && lab.setMode(v as 'quantum' | 'classical')}
          className="w-full"
        >
          <ToggleGroupItem value="quantum" className="flex-1" data-testid="mode-quantum">
            {t('spooky.quantum')}
          </ToggleGroupItem>
          <ToggleGroupItem value="classical" className="flex-1" data-testid="mode-classical">
            {t('spooky.classical')}
          </ToggleGroupItem>
        </ToggleGroup>
        {lab.mode === 'classical' ? (
          <ToggleGroup
            type="single"
            value={lab.classical}
            onValueChange={(v) => v && lab.setClassical(v as 'always0' | 'random')}
            className="w-full"
          >
            <ToggleGroupItem value="always0" className="flex-1">
              {t('spooky.always0')}
            </ToggleGroupItem>
            <ToggleGroupItem value="random" className="flex-1">
              {t('spooky.randomAnswer')}
            </ToggleGroupItem>
          </ToggleGroup>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('spooky.angles')}</span>
              <Button variant="ghost" size="sm" onClick={() => lab.setAngles(OPTIMAL_STRATEGY)}>
                {t('spooky.optimal')}
              </Button>
            </div>
            {ANGLE_KEYS.map((k) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-6">
                  <Tex math={`${k[0]}_${k[1]}`} />
                </span>
                <Slider
                  min={-16}
                  max={16}
                  step={1}
                  value={[Math.round((lab.angles[k] / Math.PI) * 8)]}
                  onValueChange={([v]) => lab.setAngles({ ...lab.angles, [k]: (v * Math.PI) / 8 })}
                  aria-label={k}
                />
                <span className="num w-14 text-right text-sm">{piText(lab.angles[k])}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label={t('spooky.theory')}
            value={fmtPct(lab.theory.win, 2)}
            tone={lab.theory.win > CLASSICAL_BOUND + 1e-9 ? 'good' : undefined}
          />
          <Stat
            label={t('spooky.chshS')}
            value={fmt(lab.theory.S)}
            tone={lab.theory.S > 2 + 1e-9 ? 'good' : undefined}
          />
        </div>
      </Section>
      <Section title={t('spooky.winRate')}>
        <div className="flex flex-wrap gap-2">
          <Button onClick={lab.playOne} disabled={lab.busy} data-testid="play-one">
            {t('spooky.playOne')}
          </Button>
          <Button variant="outline" onClick={() => lab.playMany(2000)} data-testid="play-many">
            {t('spooky.playMany', { n: 2000 })}
          </Button>
        </div>
        {r && (
          <div
            className={cn(
              'num flex items-center justify-between rounded-md border px-3 py-2 text-sm',
              r.win ? 'border-primary/50 bg-primary/10' : 'border-destructive/40 bg-destructive/10',
            )}
            aria-live="polite"
          >
            <span>{t('spooky.roundResult', { x: r.x, y: r.y, a: r.a, b: r.b })}</span>
            <span className="flex items-center gap-1 font-sans font-medium">
              {r.win ? <Check className="size-4" /> : <XIcon className="size-4" />}
              {r.win ? t('spooky.win') : t('spooky.lose')}
            </span>
          </div>
        )}
        {lab.run && rate !== null && (
          <>
            <LineChart
              series={series}
              xDomain={[1, lab.run.rounds.length]}
              yDomain={[0.4, 1]}
              refs={[
                { y: CLASSICAL_BOUND, label: `${t('spooky.classicalBound')} 75%`, color: 'var(--muted-foreground)' },
                { y: TSIRELSON_WIN, label: `${t('spooky.tsirelson')} 85.4%`, color: 'var(--primary)' },
              ]}
              ariaLabel={t('spooky.winRateChart')}
              yFormat={(v) => `${Math.round(v * 100)}%`}
              xTicks={[
                { v: 1, label: '1' },
                { v: lab.run.rounds.length, label: `${lab.run.rounds.length} ${t('spooky.rounds')}` },
              ]}
            />
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label={t('spooky.winRate')}
                value={fmtPct(rate, 2)}
                tone={rate > CLASSICAL_BOUND ? 'good' : undefined}
                testId="win-rate"
              />
              <Stat label={t('common.seed')} value={String(lab.run.seed)} />
            </div>
          </>
        )}
      </Section>
    </>
  );
}

export function EntropyPanel({ lab }: { lab: SpookyLab }) {
  const { t } = useTranslation();
  const curve = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const th = (i / 80) * (Math.PI / 2);
      const p = Math.cos(th) ** 2;
      const H = p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      pts.push({ x: th, y: H });
    }
    return [{ points: pts, color: 'var(--primary)' }];
  }, []);
  const S = reducedEntropy(lab.thetaRho, 0);
  const c = Math.cos(lab.theta),
    s = Math.sin(lab.theta);
  return (
    <Section title={t('spooky.entropyTitle')}>
      <p className="text-sm leading-relaxed text-muted-foreground">{t('spooky.entropyLead')}</p>
      <div className="rounded-md border border-border bg-background/60 px-3 py-3">
        <Tex math={`|\\psi\\rangle = ${fmt(c)}\\,|00\\rangle + ${fmt(s)}\\,|11\\rangle`} display />
      </div>
      <div className="flex items-center gap-3">
        <span className="num w-5 text-sm">θ</span>
        <Slider
          min={0}
          max={32}
          step={1}
          value={[Math.round((lab.theta / (Math.PI / 2)) * 32)]}
          onValueChange={([v]) => lab.setTheta((v / 32) * (Math.PI / 2))}
          aria-label="θ"
        />
        <span className="num w-14 text-right text-sm">{piText(lab.theta)}</span>
      </div>
      <LineChart
        series={curve}
        xDomain={[0, Math.PI / 2]}
        yDomain={[0, 1]}
        marker={{ x: lab.theta, y: S }}
        ariaLabel={t('spooky.entropyChart')}
        xTicks={[
          { v: 0, label: '0' },
          { v: Math.PI / 4, label: 'π/4' },
          { v: Math.PI / 2, label: 'π/2' },
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        <Stat label={`S(ρ_A) · ${t('spooky.bits')}`} value={fmt(S)} />
        <Stat label={t('spooky.concurrence')} value={fmt(lab.concurrence)} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t('spooky.entropyNote')}</p>
    </Section>
  );
}
