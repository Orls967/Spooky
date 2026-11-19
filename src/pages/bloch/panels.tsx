import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dices, RotateCcw, Undo2, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tex } from '@/ui/Tex';
import { Histogram, HistogramLabels } from '@/ui/charts/Histogram';
import { PhaseWheel } from '@/ui/PhaseWheel';
import { GATE_DOCS } from '@/content/gates';
import { GATES, type SingleGateId } from '@/lib/quantum/gates';
import { blochAngles, entropyFromBloch, vlen } from '@/lib/quantum/bloch';
import { fmt, fmtComplex, fmtPct, piTex, piText } from '@/lib/format';
import { phaseCss } from '@/lib/color';
import { useBi } from '@/hooks/useBi';
import { cn } from '@/lib/utils';
import type { BlochLab, Channel } from './useBlochLab';

export function Section({
  title,
  children,
  aside,
  className,
}: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3 border-b border-border px-5 py-5 last:border-b-0', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="eyebrow">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Pure state → amplitudes with global phase removed (α real ≥ 0). */
function canonicalAmplitudes(theta: number, phi: number) {
  return {
    a: { re: Math.cos(theta / 2), im: 0 },
    b: { re: Math.cos(phi) * Math.sin(theta / 2), im: Math.sin(phi) * Math.sin(theta / 2) },
  };
}

export function StateReadout({ lab }: { lab: BlochLab }) {
  const { t } = useTranslation();
  const r = vlen(lab.bloch);
  const pure = r > 0.999;
  const { theta, phi } = blochAngles(lab.bloch);
  const amps = canonicalAmplitudes(theta, phi);
  const p = lab.rho.probabilities();
  const rho01 = lab.rho.get(0, 1);
  const texPure = `|\\psi\\rangle = ${fmt(amps.a.re)}\\,|0\\rangle ${
    Math.sin(theta / 2) < 1e-9
      ? ''
      : `+ ${Math.abs(phi) < 1e-9 ? '' : `e^{i\\,${piTex((Math.round((phi / Math.PI) * 1000) / 1000) * Math.PI)}}\\,`}${fmt(Math.sin(theta / 2))}\\,|1\\rangle`
  }`;
  const texMixed = `\\rho = \\begin{pmatrix} ${fmt(p[0])} & ${fmtComplex(rho01.re, rho01.im)} \\\\ ${fmtComplex(rho01.re, -rho01.im)} & ${fmt(p[1])} \\end{pmatrix}`;

  return (
    <Section title={t('bloch.stateTitle')}>
      <div
        className="min-h-14 rounded-md border border-border bg-background/60 px-3 py-3 text-[1.05rem]"
        data-testid="bloch-state"
      >
        <Tex math={pure ? texPure : texMixed} display />
      </div>
      {!pure && <p className="text-xs text-muted-foreground">{t('bloch.mixedNote')}</p>}
      <dl className="grid grid-cols-3 gap-2 text-xs">
        {(['x', 'y', 'z'] as const).map((k, i) => (
          <div key={k} className="rounded-md border border-border px-2 py-1.5">
            <dt className="eyebrow !tracking-[0.1em]">{k}</dt>
            <dd className="num text-sm">{fmt(lab.bloch[i])}</dd>
          </div>
        ))}
        <div className="rounded-md border border-border px-2 py-1.5">
          <dt className="eyebrow !tracking-[0.1em]">θ</dt>
          <dd className="num text-sm">{piText(Math.round(theta / (Math.PI / 1000)) * (Math.PI / 1000))}</dd>
        </div>
        <div className="rounded-md border border-border px-2 py-1.5">
          <dt className="eyebrow !tracking-[0.1em]">φ</dt>
          <dd className="num text-sm">{piText(Math.round(phi / (Math.PI / 1000)) * (Math.PI / 1000))}</dd>
        </div>
        <div className="rounded-md border border-border px-2 py-1.5">
          <dt className="eyebrow !tracking-[0.1em]">|r|</dt>
          <dd className="num text-sm">{fmt(r)}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{t('bloch.amplitudes')}</span>
          <PhaseWheel size={30} />
        </div>
        {[0, 1].map((k) => {
          const amp = k === 0 ? amps.a : amps.b;
          const ph = Math.atan2(amp.im, amp.re);
          return (
            <div key={k} className="grid grid-cols-[2.2rem_1fr_4.2rem] items-center gap-2">
              <span className="num text-sm">|{k}⟩</span>
              <div className="relative h-5 overflow-hidden rounded-sm bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 rounded-sm transition-[width,background-color] duration-500 ease-out"
                  style={{ width: `${p[k] * 100}%`, background: pure ? phaseCss(ph) : 'var(--muted-foreground)' }}
                />
              </div>
              <span className="num text-right text-xs">{fmtPct(p[k])}</span>
              {pure && (
                <span className="num col-start-2 -mt-1 text-[0.7rem] text-muted-foreground">
                  {fmtComplex(amp.re, amp.im)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-baseline justify-between rounded-md border border-border px-2 py-1.5">
          <dt className="text-muted-foreground">{t('bloch.purity')}</dt>
          <dd className="num">{fmt(lab.purity)}</dd>
        </div>
        <div className="flex items-baseline justify-between rounded-md border border-border px-2 py-1.5">
          <dt className="text-muted-foreground">{t('bloch.entropy')}</dt>
          <dd className="num">{fmt(entropyFromBloch(lab.bloch))}</dd>
        </div>
      </dl>
    </Section>
  );
}

const FIXED: SingleGateId[] = ['X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg', 'SX'];

export function GateButton({
  id,
  onApply,
  size = 'default',
}: {
  id: SingleGateId;
  onApply: () => void;
  size?: 'default' | 'sm';
}) {
  const bi = useBi();
  const doc = GATE_DOCS[id];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="instrument"
          size={size === 'sm' ? 'sm' : 'default'}
          className={cn('font-semibold', size === 'sm' ? 'h-10 min-w-10 px-2' : 'h-11')}
          onClick={onApply}
          aria-label={doc ? bi(doc.name) : id}
          data-testid={`gate-${id}`}
        >
          {GATES[id].symbol}
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-64 bg-popover p-3 text-popover-foreground shadow-lg ring-1 ring-border"
      >
        {doc && <p className="mb-1 text-sm font-medium">{bi(doc.name)}</p>}
        {GATES[id].tex && <Tex math={GATES[id].tex} className="my-1" />}
        {doc && <p className="text-xs text-muted-foreground">{bi(doc.desc)}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

export function GatePad({ lab }: { lab: BlochLab }) {
  const { t } = useTranslation();
  const [rot, setRot] = useState<'RX' | 'RY' | 'RZ' | 'P'>('RY');
  const [steps, setSteps] = useState(4); // angle = steps · π/8
  const angle = (steps * Math.PI) / 8;
  return (
    <Section title={t('bloch.gates')}>
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-9 lg:grid-cols-5">
        {FIXED.map((g) => (
          <GateButton key={g} id={g} onApply={() => lab.applyGate(g)} />
        ))}
      </div>
      <div className="mt-2 flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{t('bloch.rotations')}</span>
          <ToggleGroup type="single" value={rot} onValueChange={(v) => v && setRot(v as typeof rot)}>
            {(['RX', 'RY', 'RZ', 'P'] as const).map((g) => (
              <ToggleGroupItem key={g} value={g} className="num">
                {GATES[g].symbol}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-16 text-xs text-muted-foreground">{t('bloch.angle')}</span>
          <Slider
            min={-16}
            max={16}
            step={1}
            value={[steps]}
            onValueChange={([v]) => setSteps(v)}
            aria-label={t('bloch.angle')}
          />
          <span className="num w-14 text-right text-sm">{piText(angle)}</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => lab.applyGate(rot, [angle])} data-testid="apply-rotation">
          {t('bloch.apply')} <Tex math={`${GATES[rot].symbol.replace('R', 'R_')}(${piTex(angle)})`} />
        </Button>
      </div>
    </Section>
  );
}

export function DirectState({ lab }: { lab: BlochLab }) {
  const { t } = useTranslation();
  const { theta, phi } = blochAngles(lab.bloch);
  const thetaSteps = Math.round((theta / Math.PI) * 32);
  const phiSteps = Math.round((phi / Math.PI) * 32);
  return (
    <Section title={t('bloch.direct')}>
      <p className="text-xs text-muted-foreground">{t('bloch.directHint')}</p>
      <div className="flex items-center gap-3">
        <span className="num w-5 text-sm">θ</span>
        <Slider
          min={0}
          max={32}
          step={1}
          value={[thetaSteps]}
          onValueChange={([v]) => lab.setAngles((v * Math.PI) / 32, (phiSteps * Math.PI) / 32)}
          aria-label="θ"
        />
        <span className="num w-14 text-right text-sm">{piText((thetaSteps * Math.PI) / 32)}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="num w-5 text-sm">φ</span>
        <Slider
          min={-32}
          max={32}
          step={1}
          value={[phiSteps]}
          onValueChange={([v]) => lab.setAngles((thetaSteps * Math.PI) / 32, (v * Math.PI) / 32)}
          aria-label="φ"
        />
        <span className="num w-14 text-right text-sm">{piText((phiSteps * Math.PI) / 32)}</span>
      </div>
    </Section>
  );
}

export function MeasurePanel({ lab }: { lab: BlochLab }) {
  const { t } = useTranslation();
  const [n, setN] = useState('1000');
  const p = lab.rho.probabilities();
  const data = lab.shots
    ? [
        { label: '0', value: lab.shots.counts[0], expected: p[0], color: 'var(--primary)' },
        { label: '1', value: lab.shots.counts[1], expected: p[1], color: 'var(--ink)' },
      ]
    : [
        { label: '0', value: 0, expected: p[0] },
        { label: '1', value: 0, expected: p[1] },
      ];
  return (
    <Section title={t('bloch.measureTitle')}>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={lab.measure} data-testid="measure-once">
          {t('bloch.measureOnce')}
        </Button>
        {lab.lastOutcome !== null && (
          <span
            className="num rounded-sm border border-primary/40 bg-primary/10 px-2 py-1 text-sm text-primary"
            aria-live="polite"
          >
            {t('bloch.lastOutcome', { outcome: `|${lab.lastOutcome}⟩` })}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t('bloch.measureHint')}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <ToggleGroup type="single" value={n} onValueChange={(v) => v && setN(v)} aria-label="shots">
          {['100', '1000', '8192'].map((k) => (
            <ToggleGroupItem key={k} value={k} className="num">
              {k}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={() => lab.runShots(Number(n))} data-testid="run-shots">
          {t('bloch.runShots', { n })}
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="eyebrow">{t('common.seed')}</span>
        <span className="num text-foreground">{lab.shots?.seed ?? lab.seed}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('bloch.newSeed')}
          onClick={() => lab.setSeed(Math.floor(Math.random() * 100000))}
        >
          <Dices />
        </Button>
        {lab.shots && (
          <Button variant="ghost" size="sm" onClick={() => lab.runShots(lab.shots!.total, lab.shots!.seed)}>
            <RotateCcw /> {t('bloch.replay')}
          </Button>
        )}
      </div>
      <Histogram data={data} total={lab.shots?.total ?? 1} ariaLabel={t('bloch.histogram')} height={120} />
      <HistogramLabels data={data} total={lab.shots?.total ?? 0} />
      <p className="text-[0.7rem] text-muted-foreground">{t('bloch.expected')}</p>
    </Section>
  );
}

export function NoisePanel({ lab }: { lab: BlochLab }) {
  const { t } = useTranslation();
  return (
    <Section
      title={t('bloch.decoherence')}
      aside={<Switch checked={lab.noiseOn} onCheckedChange={lab.setNoiseOn} aria-label={t('bloch.noiseOn')} />}
    >
      <p className="text-xs text-muted-foreground">{t('bloch.decoherenceHint')}</p>
      <label className="flex items-center justify-between gap-2 text-sm">
        <span>{t('bloch.noiseOn')}</span>
        <span className="num text-xs text-muted-foreground">{lab.noiseOn ? 'ON' : 'OFF'}</span>
      </label>
      <ToggleGroup
        type="single"
        value={lab.channel}
        onValueChange={(v) => v && lab.setChannel(v as Channel)}
        className="w-full"
      >
        <ToggleGroupItem value="depolarize" className="flex-1">
          {t('bloch.depolarizing')}
        </ToggleGroupItem>
        <ToggleGroupItem value="dephase" className="flex-1">
          {t('bloch.dephasing')}
        </ToggleGroupItem>
        <ToggleGroupItem value="amplitudeDamp" className="flex-1">
          {t('bloch.amplitudeDamping')}
        </ToggleGroupItem>
      </ToggleGroup>
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-muted-foreground">{t('bloch.strength')}</span>
        <Slider
          min={0}
          max={100}
          step={1}
          value={[Math.round(lab.strength * 100)]}
          onValueChange={([v]) => lab.setStrength(v / 100)}
          aria-label={t('bloch.strength')}
        />
        <span className="num w-10 text-right text-sm">{lab.strength.toFixed(2)}</span>
      </div>
      <Button variant="outline" size="sm" onClick={lab.decay} data-testid="decay">
        <Waves /> {t('bloch.decay')}
      </Button>
    </Section>
  );
}

export function HistoryStrip({ lab, className }: { lab: BlochLab; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label={t('bloch.history')}>
        <span className="num shrink-0 text-xs text-muted-foreground">|0⟩</span>
        {lab.history.length === 0 && (
          <span className="truncate text-xs text-muted-foreground">— {t('bloch.historyEmpty')}</span>
        )}
        {lab.history.map((h, i) => (
          <span key={i} className="num shrink-0 rounded-sm border border-border bg-card px-1.5 py-0.5 text-[0.7rem]">
            {h.label}
          </span>
        ))}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={lab.undo}
        disabled={!lab.history.length}
        aria-label={t('bloch.undo')}
      >
        <Undo2 />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={lab.reset} aria-label={t('bloch.resetState')}>
        <RotateCcw />
      </Button>
    </div>
  );
}
