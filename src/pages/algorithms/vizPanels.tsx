import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { phaseCss } from '@/lib/color';
import { fmt, fmtPct } from '@/lib/format';
import { basisLabel } from '@/lib/quantum/statevector';
import { factorsFromPeriod, periodFromMeasurement } from '@/lib/quantum/algorithms';
import { Histogram, HistogramLabels } from '@/ui/charts/Histogram';

/** 2D picture of Grover's rotation in the plane spanned by |ω⟩ and |s′⟩. */
export function GroverGeometry({
  n,
  marked,
  amplitudes,
  prevAmplitudes,
}: {
  n: number;
  marked: number;
  amplitudes: Float64Array;
  prevAmplitudes?: Float64Array;
}) {
  const { t } = useTranslation();
  const N = 1 << n;
  const angleOf = (a: Float64Array) => {
    const w = a[2 * marked];
    let rest = 0;
    for (let i = 0; i < N; i++) if (i !== marked) rest += a[2 * i];
    return Math.atan2(w, rest / Math.sqrt(N - 1));
  };
  const ang = angleOf(amplitudes);
  const prev = prevAmplitudes ? angleOf(prevAmplitudes) : null;
  const theta = Math.asin(1 / Math.sqrt(N));
  const R = 92,
    cx = 110,
    cy = 112;
  const pt = (a: number, r = R) => [cx + Math.cos(a) * r, cy - Math.sin(a) * r];
  const [sx, sy] = pt(theta);
  const arc = (a0: number, a1: number, r: number) => {
    const [x0, y0] = pt(a0, r),
      [x1, y1] = pt(a1, r);
    return `M${x0} ${y0} A ${r} ${r} 0 0 ${a1 > a0 ? 0 : 1} ${x1} ${y1}`;
  };
  const pw = amplitudes[2 * marked] ** 2 + amplitudes[2 * marked + 1] ** 2;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="eyebrow">{t('algorithms.groverTitle')}</figcaption>
      <svg
        viewBox="0 0 220 220"
        className="w-full max-w-[260px] self-center"
        role="img"
        aria-label={t('algorithms.groverTitle')}
      >
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" />
        <line x1={cx - R - 6} x2={cx + R + 6} y1={cy} y2={cy} stroke="var(--muted-foreground)" strokeWidth={1} />
        <line x1={cx} x2={cx} y1={cy + R + 6} y2={cy - R - 6} stroke="var(--muted-foreground)" strokeWidth={1} />
        <text x={cx + R + 4} y={cy + 13} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">
          {t('algorithms.groverAxisRest')}
        </text>
        <text x={cx + 4} y={cy - R - 4} className="fill-muted-foreground font-mono text-[8px]">
          {t('algorithms.groverAxisTarget')}
        </text>
        <line x1={cx} y1={cy} x2={sx} y2={sy} stroke="var(--muted-foreground)" strokeDasharray="3 2" />
        <text x={sx + 3} y={sy - 2} className="fill-muted-foreground font-mono text-[8px]">
          |s⟩
        </text>
        {prev !== null && Math.abs(prev - ang) > 1e-6 && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={pt(prev)[0]}
              y2={pt(prev)[1]}
              stroke="var(--foreground)"
              strokeOpacity={0.25}
              strokeWidth={2}
            />
            <path d={arc(prev, ang, 34)} fill="none" stroke="var(--primary)" strokeWidth={1.4} strokeDasharray="2 2" />
          </>
        )}
        <g
          style={{
            transform: `rotate(${(-ang * 180) / Math.PI}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'transform 700ms cubic-bezier(.16,1,.3,1)',
          }}
        >
          <line x1={cx} y1={cy} x2={cx + R} y2={cy} stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" />
          <circle cx={cx + R} cy={cy} r={4.5} fill="var(--primary)" />
        </g>
      </svg>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{t('algorithms.groverProb')}</span>
        <span className="num text-base text-primary">{fmtPct(pw)}</span>
      </div>
      <p className="text-[0.7rem] text-muted-foreground">{t('algorithms.groverHint')}</p>
    </figure>
  );
}

/** One dial per output amplitude: needle direction = phase, length = magnitude. */
export function PhaseWheels({ n, amplitudes }: { n: number; amplitudes: Float64Array }) {
  const { t } = useTranslation();
  const N = 1 << n;
  let max = 0;
  for (let i = 0; i < N; i++) max = Math.max(max, Math.hypot(amplitudes[2 * i], amplitudes[2 * i + 1]));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="eyebrow">{t('algorithms.phaseWheels')}</figcaption>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: N }, (_, i) => {
          const re = amplitudes[2 * i],
            im = amplitudes[2 * i + 1];
          const mag = Math.hypot(re, im);
          const ph = Math.atan2(im, re);
          const L = max > 0 ? (mag / max) * 17 : 0;
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <svg viewBox="0 0 44 44" className="size-12">
                <circle cx={22} cy={22} r={19} fill="none" stroke="var(--border)" />
                {mag > 1e-6 && (
                  <g
                    style={{
                      transform: `rotate(${(-ph * 180) / Math.PI}deg)`,
                      transformOrigin: '22px 22px',
                      transition: 'transform 600ms ease-out',
                    }}
                  >
                    <line
                      x1={22}
                      y1={22}
                      x2={22 + L}
                      y2={22}
                      stroke={phaseCss(ph)}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </g>
                )}
                <circle cx={22} cy={22} r={1.8} fill="var(--foreground)" />
              </svg>
              <span className="num text-[0.6rem] text-muted-foreground">|{basisLabel(i, n)}⟩</span>
            </div>
          );
        })}
      </div>
      <p className="text-[0.7rem] text-muted-foreground">{t('algorithms.phaseWheelsHint')}</p>
    </figure>
  );
}

/** Counting-register distribution + continued-fraction post-processing for Shor N = 15. */
export function ShorPanel({
  amplitudes,
  a,
  measured,
}: {
  amplitudes: Float64Array;
  a: number;
  measured: number | null;
}) {
  const { t } = useTranslation();
  const counting = useMemo(() => {
    const c = new Float64Array(16);
    for (let i = 0; i < 256; i++) c[i >> 4] += amplitudes[2 * i] ** 2 + amplitudes[2 * i + 1] ** 2;
    return c;
  }, [amplitudes]);
  const peaks = Array.from({ length: 16 }, (_, y) => y).filter((y) => counting[y] > 0.01);
  const rows = peaks.map((y) => {
    const r = periodFromMeasurement(y, 16, a, 15);
    return { y, p: counting[y], r, f: r ? factorsFromPeriod(a, r, 15) : null };
  });
  const found = rows.find((x) => x.f);
  const data = Array.from({ length: 16 }, (_, y) => ({
    label: y.toString(2).padStart(4, '0'),
    value: Math.round(counting[y] * 1000),
    color: measured === y ? 'var(--primary)' : 'var(--ink)',
  }));
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="eyebrow">{t('algorithms.shorCounting')}</figcaption>
      <Histogram data={data} total={1000} height={100} fitMax ariaLabel={t('algorithms.shorCounting')} />
      <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] text-center">
        {Array.from({ length: 16 }, (_, y) => (
          <span key={y} className="num text-[0.55rem] text-muted-foreground">
            {y}
          </span>
        ))}
      </div>
      <h3 className="eyebrow mt-1">{t('algorithms.shorTable')}</h3>
      <table className="num w-full text-xs">
        <tbody>
          {rows.map((row) => (
            <tr key={row.y} className={measured === row.y ? 'text-primary' : undefined}>
              <td className="py-0.5">y={row.y}</td>
              <td>{row.y}/16</td>
              <td>{fmtPct(row.p, 0)}</td>
              <td>{row.r ? `r=${row.r}` : '—'}</td>
              <td className="text-right">{row.f ? `${row.f[0]}×${row.f[1]}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="rounded-md border border-border px-3 py-2 text-sm">
        {found?.f ? t('algorithms.shorFactors', { a: found.f[0], b: found.f[1] }) : t('algorithms.shorNoFactor')}
        {found?.r && (
          <span className="ml-2 text-xs text-muted-foreground">
            ({t('algorithms.period')} = {fmt(found.r, 0)})
          </span>
        )}
      </p>
    </figure>
  );
}

// histogram labels re-exported for convenience
export { HistogramLabels };
